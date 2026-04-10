import { BadRequestException, Injectable } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";
import { AdminAuditService, type AdminRequestMeta, type JsonLike } from "./admin-audit.service";
import { AdminSqlExecuteDto } from "./dto/admin-sql-execute.dto";

const sqlRowLimit = 200;
const sqlPayloadLimitBytes = 256_000;
const sqlTimeoutMs = 5_000;

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

    const normalized = trimmed.replace(/\s+/g, " ").trim().toUpperCase();

    if (/\b(INSERT|UPDATE|DELETE|ALTER|DROP|CREATE|TRUNCATE|GRANT|REVOKE|COPY|DO|CALL|MERGE|VACUUM|REINDEX|REFRESH|SET|RESET|SHOW|DISCARD|BEGIN|COMMIT|ROLLBACK|LOCK)\b/.test(normalized)) {
      throw new BadRequestException("Only read-only SQL is allowed");
    }

    if (!/^(SELECT|WITH|EXPLAIN)\b/.test(normalized)) {
      throw new BadRequestException("Only SELECT, WITH ... SELECT, and EXPLAIN are allowed");
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
