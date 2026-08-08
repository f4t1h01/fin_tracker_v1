import { BadRequestException, Injectable } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";
import { AdminAuditService, type AdminRequestMeta, type JsonLike } from "./admin-audit.service";
import { AdminSqlExecuteDto } from "./dto/admin-sql-execute.dto";

const sqlRowLimit = 200;
const sqlPayloadLimitBytes = 256_000;
const sqlTimeoutMs = 5_000;

/**
 * Prisma connects as the database owner, so a plain SELECT can still reach
 * superuser-only functions that read files on the database host, import/export
 * large objects, or open outbound connections. None of those are DML, so the
 * write-keyword denylist below does not catch them and they need naming.
 *
 * Matched against the statement with `_` treated as a word character, because
 * `\b(SET)\b` does not match inside `SET_CONFIG`.
 */
const forbiddenSqlIdentifiers = [
  // Server-side file and directory access.
  "PG_READ_FILE",
  "PG_READ_BINARY_FILE",
  "PG_STAT_FILE",
  "PG_LS_DIR",
  "PG_LS_LOGDIR",
  "PG_LS_WALDIR",
  "PG_LS_ARCHIVE_STATUSDIR",
  "PG_LS_TMPDIR",
  "PG_LOGDIR_LS",
  // Large object import/export writes to and reads from the host filesystem.
  "LO_IMPORT",
  "LO_EXPORT",
  "LO_PUT",
  "LO_FROM_BYTEA",
  "LOWRITE",
  // Outbound connections / arbitrary execution bridges.
  "DBLINK",
  "DBLINK_EXEC",
  "DBLINK_CONNECT",
  "PG_TERMINATE_BACKEND",
  "PG_CANCEL_BACKEND",
  "PG_RELOAD_CONF",
  "PG_ROTATE_LOGFILE",
  "PG_PROMOTE",
  "PG_SLEEP",
  "PG_SLEEP_FOR",
  "PG_SLEEP_UNTIL",
  // Session mutation smuggled past the SET keyword check.
  "SET_CONFIG",
  // Stored credential material.
  "PG_AUTHID",
  "PG_SHADOW",
  "PG_STATISTIC"
];

/** Columns holding secrets or password material, even inside our own tables. */
const forbiddenSqlColumns = ["PASSWORDHASH", "PASSWORD_HASH", "SMTP_PASSWORD_ENCRYPTED", "CODE_HASH", "ROLPASSWORD"];

@Injectable()
export class AdminSqlService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService
  ) {}

  private get db(): any {
    return this.prisma.client as any;
  }

  private validateSqlStatement(statement: string) {
    const trimmed = statement.trim();
    if (!trimmed) {
      throw new BadRequestException("SQL statement is required");
    }

    if (trimmed.includes(";")) {
      throw new BadRequestException("Only a single statement without semicolons is allowed");
    }

    if (/--|\/\*|\*\//.test(trimmed)) {
      throw new BadRequestException("SQL comments are not allowed");
    }

    // Dollar-quoted strings can carry a whole function body past keyword checks.
    if (/\$[A-Za-z0-9_]*\$/.test(trimmed)) {
      throw new BadRequestException("Dollar-quoted strings are not allowed");
    }

    const normalized = trimmed.replace(/\s+/g, " ").trim().toUpperCase();

    if (/\b(INSERT|UPDATE|DELETE|ALTER|DROP|CREATE|TRUNCATE|GRANT|REVOKE|COPY|DO|CALL|MERGE|VACUUM|REINDEX|REFRESH|SET|RESET|SHOW|DISCARD|BEGIN|COMMIT|ROLLBACK|LOCK)\b/.test(normalized)) {
      throw new BadRequestException("Only read-only SQL is allowed");
    }

    if (!/^(SELECT|WITH|EXPLAIN)\b/.test(normalized)) {
      throw new BadRequestException("Only SELECT, WITH ... SELECT, and EXPLAIN are allowed");
    }

    // `_` is a word character for \b, so identifiers are bounded manually.
    const identifierBoundary = "(?<![A-Z0-9_])%s(?![A-Z0-9_])";
    for (const identifier of forbiddenSqlIdentifiers) {
      if (new RegExp(identifierBoundary.replace("%s", identifier)).test(normalized)) {
        throw new BadRequestException(`${identifier} is not allowed in the read-only console`);
      }
    }

    for (const column of forbiddenSqlColumns) {
      if (new RegExp(identifierBoundary.replace("%s", column)).test(normalized.replace(/"/g, ""))) {
        throw new BadRequestException("Reading stored credential material is not allowed");
      }
    }

    return trimmed;
  }

  private serializeRows(rows: unknown[]) {
    const normalizedRows = rows.map((row) => this.audit.normalizeJson(row));
    const serialized = JSON.stringify(normalizedRows);

    if (serialized.length <= sqlPayloadLimitBytes) {
      return {
        rows: normalizedRows,
        truncated: false
      };
    }

    const bounded: JsonLike[] = [];
    let size = 2;
    for (const row of normalizedRows) {
      const chunk = JSON.stringify(row);
      if (size + chunk.length + (bounded.length > 0 ? 1 : 0) > sqlPayloadLimitBytes) {
        break;
      }

      bounded.push(row);
      size += chunk.length + (bounded.length > 1 ? 1 : 0);
    }

    return {
      rows: bounded,
      truncated: true
    };
  }

  async execute(dto: AdminSqlExecuteDto, adminEmail: string, requestMeta: AdminRequestMeta) {
    const statement = this.validateSqlStatement(dto.statement);
    const startedAt = Date.now();

    try {
      const upper = statement.replace(/\s+/g, " ").trim().toUpperCase();
      const sql =
        upper.startsWith("EXPLAIN")
          ? statement
          : `SELECT * FROM (${statement}) AS "__admin_sql" LIMIT ${sqlRowLimit + 1}`;

      const rows = await this.db.$transaction(async (tx: any) => {
        await tx.$executeRawUnsafe(`SET LOCAL statement_timeout = ${sqlTimeoutMs}`);
        // Defence in depth: even if the keyword filters are bypassed, the engine
        // itself refuses to write inside this transaction.
        await tx.$executeRawUnsafe("SET LOCAL transaction_read_only = on");
        return tx.$queryRawUnsafe(sql);
      });

      const hadRowOverflow = rows.length > sqlRowLimit;
      const boundedRows = hadRowOverflow ? rows.slice(0, sqlRowLimit) : rows;
      const serialized = this.serializeRows(boundedRows);
      const firstRow = serialized.rows[0];
      const columns =
        firstRow && typeof firstRow === "object" && !Array.isArray(firstRow)
          ? Object.keys(firstRow as Record<string, unknown>)
          : [];

      const result = {
        columns,
        rows: serialized.rows,
        rowCount: boundedRows.length,
        durationMs: Date.now() - startedAt,
        truncated: hadRowOverflow || serialized.truncated,
        error: null as string | null
      };

      await this.audit.log({
        adminEmail,
        actionType: "SQL_EXECUTE",
        targetType: "SQL",
        targetId: "read-only-console",
        requestMeta,
        beforeState: {
          statement
        },
        afterState: {
          rowCount: result.rowCount,
          durationMs: result.durationMs,
          truncated: result.truncated
        },
        outcome: "SUCCESS"
      });

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : "SQL execution failed";
      await this.audit.log({
        adminEmail,
        actionType: "SQL_EXECUTE",
        targetType: "SQL",
        targetId: "read-only-console",
        requestMeta,
        beforeState: {
          statement
        },
        outcome: "ERROR",
        errorMessage: message
      });

      return {
        columns: [] as string[],
        rows: [] as JsonLike[],
        rowCount: 0,
        durationMs: Date.now() - startedAt,
        truncated: false,
        error: message
      };
    }
  }
}
