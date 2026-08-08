import { HttpException, HttpStatus, Injectable } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";

export type AiQuotaFeature = "VOICE_DRAFT" | "RECEIPT_DRAFT" | "GOODS_ADVISOR";

/**
 * Daily per-user ceilings. AI calls were previously metered and priced but never
 * capped, so any signed-in account could spend the whole provider budget.
 *
 * The counter is derived from AiUsageLog rather than an in-memory map, so it
 * survives restarts and stays correct across replicas.
 */
const dailyLimits: Record<AiQuotaFeature, number> = {
  VOICE_DRAFT: 60,
  RECEIPT_DRAFT: 60,
  GOODS_ADVISOR: 120
};

const friendlyNames: Record<AiQuotaFeature, string> = {
  VOICE_DRAFT: "voice drafts",
  RECEIPT_DRAFT: "receipt scans",
  GOODS_ADVISOR: "advisor messages"
};

@Injectable()
export class AiQuotaService {
  constructor(private readonly prisma: PrismaService) {}

  private startOfUtcDay(now: Date) {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }

  async assertWithinDailyQuota(userId: string, feature: AiQuotaFeature) {
    const limit = dailyLimits[feature];
    const since = this.startOfUtcDay(new Date());

    // AiQuotaFeature values match the strings written to AiUsageLog.feature.
    const used = await this.prisma.client.aiUsageLog.count({
      where: {
        userId,
        feature,
        createdAt: { gte: since }
      }
    });

    if (used < limit) {
      return { used, limit };
    }

    throw new HttpException(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message: `Daily limit reached for ${friendlyNames[feature]} (${limit} per day). Try again tomorrow.`,
        feature,
        limit,
        used
      },
      HttpStatus.TOO_MANY_REQUESTS
    );
  }
}
