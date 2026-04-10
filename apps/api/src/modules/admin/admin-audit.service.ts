import { Injectable } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";

export type AdminRequestMeta = {
  ip: string | null;
  userAgent: string | null;
  path: string | null;
};

export type JsonLike =
  | null
  | boolean
  | number
  | string
  | JsonLike[]
  | { [key: string]: JsonLike };

function normalizeUnknown(value: unknown): JsonLike {
  if (value === null || value === undefined) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeUnknown(item));
  }

  if (typeof value === "object") {
    if ("toNumber" in value && typeof (value as { toNumber?: unknown }).toNumber === "function") {
      return (value as { toNumber: () => number }).toNumber();
    }

    const result: Record<string, JsonLike> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      result[key] = normalizeUnknown(entry);
    }

    return result;
  }

  return String(value);
}

@Injectable()
export class AdminAuditService {
  constructor(private readonly prisma: PrismaService) {}

  private get db(): any {
    return this.prisma.client as any;
  }

  normalizeJson(value: unknown) {
    return normalizeUnknown(value);
  }

  async log(entry: {
    adminEmail?: string | null;
    actionType: string;
    targetType?: string | null;
    targetId?: string | null;
    reason?: string | null;
    requestMeta?: AdminRequestMeta | null;
    beforeState?: unknown;
    afterState?: unknown;
    outcome: "SUCCESS" | "ERROR";
    errorMessage?: string | null;
  }) {
    await this.db.adminAuditLog.create({
      data: {
        adminEmail: entry.adminEmail ?? null,
        actionType: entry.actionType,
        targetType: entry.targetType ?? null,
        targetId: entry.targetId ?? null,
        reason: entry.reason ?? null,
        requestMetadata: entry.requestMeta ? normalizeUnknown(entry.requestMeta) : null,
        beforeState: entry.beforeState === undefined ? null : normalizeUnknown(entry.beforeState),
        afterState: entry.afterState === undefined ? null : normalizeUnknown(entry.afterState),
        outcome: entry.outcome,
        errorMessage: entry.errorMessage ?? null
      }
    });
  }
}
