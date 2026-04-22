import { BadRequestException, Injectable, ServiceUnavailableException, UnauthorizedException } from "@nestjs/common";
import { createHash, randomUUID } from "node:crypto";

import { AiThreadService } from "../ai/ai-thread.service";
import { AiUsageService } from "../ai/ai-usage.service";
import { PrismaService } from "../prisma/prisma.service";
import { OpenAiRequestError } from "../profile/voice/openai-request-error";
import {
  CreateGoodsAdvisorMessageDto,
  CreateGoodsAdvisorThreadDto,
  CreateGoodsCategoryDto,
  GoodsDinnerAdvisorDto,
  CreateGoodsItemDto,
  CreateGoodsPlaceDto,
  GoodsArchiveDto,
  GoodsListQueryDto,
  GoodsMoveDto,
  GoodsQuantityMutationDto,
  GoodsReconcileDto,
  UpdateGoodsAdvisorThreadDto,
  UpdateGoodsCategoryDto,
  UpdateGoodsItemDto,
  UpdateGoodsVisibilityDto,
  UpdateGoodsPlaceDto
} from "./dto/goods.dto";
import { GOODS_ADVISOR_CACHE_TTL_MS, GOODS_ADVISOR_ITEM_CAP, OPENAI_GOODS_ADVISOR_MODEL } from "./goods-advisor.constants";
import type { GoodsAdvisorResponseMode, GoodsDinnerRecipeSuggestion } from "./goods-dinner-advisor.schema";
import { requestGoodsDinnerAdvice } from "./openai-goods-advisor.client";

const goodsTimeZone = "Asia/Tashkent";
const defaultGoodsCategories = ["Vegetables", "Fruits", "Meat", "Dairy", "Drinks", "Snacks", "Other"] as const;

type GoodsScope = "PERSONAL" | "SHARED";
type GoodsAdvisorScope = GoodsScope | "AUTO";
type GoodsConsumptionUnit = "HOUR" | "DAY" | "WEEK" | "PERMANENT";
type GoodsStockStatus = "FULL" | "ENOUGH" | "LOW" | "OUT_OF_STOCK";
type GoodsExpirationStatus = "FRESH" | "EXPIRING_SOON" | "EXPIRED" | "NO_EXPIRATION";
type GoodsAdvisorRecipePreviewType = "youtube_search" | "image_search";

type GoodsAdvisorCompactItem = {
  name: string;
  quantityLabel: string;
  categoryName: string | null;
  expirationStatus: GoodsExpirationStatus;
  daysUntilExpiry: number | null;
  stockStatus: GoodsStockStatus;
  score: number;
};

type GoodsDinnerAdvisorResponse =
  | {
      mode: "DINNER_RECOMMENDATION";
      assistantMessage: string;
      pantryMeals: [GoodsDinnerRecipeSuggestion, GoodsDinnerRecipeSuggestion];
      minimalBuyMeal: GoodsDinnerRecipeSuggestion;
      warnings: string[];
    }
  | {
      mode: Exclude<GoodsAdvisorResponseMode, "DINNER_RECOMMENDATION">;
      assistantMessage: string;
      pantryMeals: [];
      minimalBuyMeal: null;
      warnings: string[];
    };

type GoodsAdvisorIntent = "DINNER_RECOMMENDATION" | "PANTRY_QA" | "RECEIPT_FOLLOW_UP";

type GoodsAdvisorPantryState = {
  hasAnyItems: boolean;
  hasUsableItems: boolean;
  hasOnlyExpiredOrEmptyItems: boolean;
};

type GoodsAdvisorCacheEntry = {
  expiresAt: number;
  response: unknown;
};

function normalizeGoodsName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeGoodsLookupName(value: string) {
  return normalizeGoodsName(value).toLowerCase();
}

function quantityToNumber(value: { toNumber: () => number } | number | string | null | undefined) {
  if (value == null) {
    return 0;
  }

  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    return Number(value);
  }

  return value.toNumber();
}

function roundQuantity(value: number) {
  return Number(value.toFixed(3));
}

function roundRate(value: number) {
  return Number(value.toFixed(8));
}

function serializeQuantity(value: number) {
  return roundQuantity(value).toFixed(3);
}

function trimText(value: string, maxLength: number) {
  const normalized = value.trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function normalizeCacheText(value: string) {
  return normalizeGoodsLookupName(value);
}

function isUsableAdvisorItem(item: Pick<GoodsAdvisorCompactItem, "expirationStatus" | "stockStatus">) {
  return item.expirationStatus !== "EXPIRED" && item.stockStatus !== "OUT_OF_STOCK";
}

function buildAdvisorPantryState(items: GoodsAdvisorCompactItem[]): GoodsAdvisorPantryState {
  const hasAnyItems = items.length > 0;
  const hasUsableItems = items.some((item) => isUsableAdvisorItem(item));

  return {
    hasAnyItems,
    hasUsableItems,
    hasOnlyExpiredOrEmptyItems: hasAnyItems && !hasUsableItems
  };
}

function detectAdvisorIntent(params: {
  message: string;
  recentMessages?: Array<{ role: string; text: string }>;
  summaryText?: string | null;
}): GoodsAdvisorIntent {
  const normalizedMessage = normalizeGoodsLookupName(params.message);
  const dinnerPattern =
    /\b(dinner|lunch|breakfast|cook|cooking|meal|recipe|recipes|what can i eat|what should i eat|what can i make|what should i make)\b/;
  const receiptPattern = /\b(receipt|receipts|bill|invoice|total|subtotal|spent|cost|price|charged)\b/;
  const conversationContext = [params.summaryText ?? "", ...(params.recentMessages ?? []).map((message) => message.text)]
    .join("\n")
    .toLowerCase();
  const hasReceiptContext = /\b(receipt|bill|invoice|subtotal|total|food receipt)\b/.test(conversationContext);

  if (receiptPattern.test(normalizedMessage)) {
    return "RECEIPT_FOLLOW_UP";
  }

  if (hasReceiptContext && /\b(it|that|this|there|item|items|total|cost|price)\b/.test(normalizedMessage)) {
    return "RECEIPT_FOLLOW_UP";
  }

  if (dinnerPattern.test(normalizedMessage)) {
    return "DINNER_RECOMMENDATION";
  }

  return "PANTRY_QA";
}

function expirationRank(value: GoodsExpirationStatus) {
  if (value === "EXPIRING_SOON") {
    return 0;
  }

  if (value === "FRESH") {
    return 1;
  }

  if (value === "NO_EXPIRATION") {
    return 2;
  }

  return 3;
}

function stockRank(value: GoodsStockStatus) {
  if (value === "LOW") {
    return 0;
  }

  if (value === "ENOUGH") {
    return 1;
  }

  if (value === "FULL") {
    return 2;
  }

  return 3;
}

function parseDateOnly(value?: string | null) {
  if (!value || !value.trim()) {
    return null;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) {
    throw new BadRequestException("Date must use YYYY-MM-DD");
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) {
    throw new BadRequestException("Date is invalid");
  }

  return parsed;
}

function dateKeyParts(value: Date, timeZone = goodsTimeZone) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });

  const parts = formatter.formatToParts(value);
  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return { year, month, day };
}

function toDayKey(value: Date, timeZone = goodsTimeZone) {
  const parts = dateKeyParts(value, timeZone);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function parseDayKey(value: string) {
  const [yearText, monthText, dayText] = value.split("-");
  return new Date(Date.UTC(Number(yearText), Number(monthText) - 1, Number(dayText)));
}

function addDaysToKey(value: string, amount: number) {
  const date = parseDayKey(value);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function diffDays(fromKey: string, toKey: string) {
  const from = parseDayKey(fromKey);
  const to = parseDayKey(toKey);
  return Math.round((to.getTime() - from.getTime()) / 86400000);
}

function normalizeConsumptionConfig(consumptionRateValue?: number | null, consumptionRateUnit?: GoodsConsumptionUnit) {
  if (!consumptionRateUnit || consumptionRateUnit === "PERMANENT" || consumptionRateValue == null || consumptionRateValue <= 0) {
    return {
      value: null,
      unit: "PERMANENT" as GoodsConsumptionUnit,
      ratePerHour: null
    };
  }

  if (consumptionRateUnit === "HOUR") {
    return {
      value: roundQuantity(consumptionRateValue),
      unit: consumptionRateUnit,
      ratePerHour: roundRate(consumptionRateValue)
    };
  }

  if (consumptionRateUnit === "DAY") {
    return {
      value: roundQuantity(consumptionRateValue),
      unit: consumptionRateUnit,
      ratePerHour: roundRate(consumptionRateValue / 24)
    };
  }

  return {
    value: roundQuantity(consumptionRateValue),
    unit: consumptionRateUnit,
    ratePerHour: roundRate(consumptionRateValue / (24 * 7))
  };
}

function assertThresholds(lowStockThreshold: number, targetQuantity: number) {
  if (lowStockThreshold < 0) {
    throw new BadRequestException("Low-stock threshold cannot be negative");
  }

  if (targetQuantity <= 0) {
    throw new BadRequestException("Target quantity must be greater than zero");
  }

  if (lowStockThreshold > targetQuantity) {
    throw new BadRequestException("Low-stock threshold cannot be greater than target quantity");
  }
}

function computeProjectedQuantity(baseQuantity: number, baseAsOf: Date, ratePerHour?: number | null, now = new Date()) {
  if (!ratePerHour || ratePerHour <= 0) {
    return roundQuantity(baseQuantity);
  }

  const elapsedMs = Math.max(0, now.getTime() - baseAsOf.getTime());
  const elapsedHours = elapsedMs / 3600000;
  return roundQuantity(Math.max(0, baseQuantity - elapsedHours * ratePerHour));
}

function computeEstimatedRunOutAt(effectiveQuantity: number, ratePerHour?: number | null, now = new Date()) {
  if (!ratePerHour || ratePerHour <= 0 || effectiveQuantity <= 0) {
    return null;
  }

  const hoursRemaining = effectiveQuantity / ratePerHour;
  return new Date(now.getTime() + hoursRemaining * 3600000).toISOString();
}

function computeStockStatus(effectiveQuantity: number, lowStockThreshold: number, targetQuantity: number): GoodsStockStatus {
  if (effectiveQuantity <= 0) {
    return "OUT_OF_STOCK";
  }

  if (effectiveQuantity <= lowStockThreshold) {
    return "LOW";
  }

  if (effectiveQuantity >= targetQuantity * 0.9) {
    return "FULL";
  }

  return "ENOUGH";
}

function computeExpirationState(expirationDate?: Date | null, now = new Date()) {
  if (!expirationDate) {
    return {
      expirationStatus: "NO_EXPIRATION" as GoodsExpirationStatus,
      expirationDate: null,
      daysUntilExpiry: null
    };
  }

  const todayKey = toDayKey(now);
  const expiryKey = expirationDate.toISOString().slice(0, 10);
  const daysUntilExpiry = diffDays(todayKey, expiryKey);

  if (todayKey > expiryKey) {
    return {
      expirationStatus: "EXPIRED" as GoodsExpirationStatus,
      expirationDate: expirationDate.toISOString(),
      daysUntilExpiry
    };
  }

  if (todayKey >= addDaysToKey(expiryKey, -3)) {
    return {
      expirationStatus: "EXPIRING_SOON" as GoodsExpirationStatus,
      expirationDate: expirationDate.toISOString(),
      daysUntilExpiry
    };
  }

  return {
    expirationStatus: "FRESH" as GoodsExpirationStatus,
    expirationDate: expirationDate.toISOString(),
    daysUntilExpiry
  };
}

function formatAdvisorQuantity(value: number, decimals: number) {
  const safeDecimals = Math.min(Math.max(decimals, 0), 3);
  const fixed = value.toFixed(safeDecimals);
  if (safeDecimals === 0) {
    return fixed;
  }

  return fixed.replace(/\.?0+$/, "");
}

function buildCompactItemScore(item: {
  effectiveQuantity: number;
  expirationStatus: GoodsExpirationStatus;
  daysUntilExpiry: number | null;
  stockStatus: GoodsStockStatus;
}) {
  let score = 0;

  if (item.effectiveQuantity > 0) {
    score += 20;
  }

  if (item.expirationStatus === "EXPIRING_SOON") {
    score += 70;
    if (typeof item.daysUntilExpiry === "number") {
      score += Math.max(0, 10 - Math.max(item.daysUntilExpiry, 0));
    }
  }

  if (item.expirationStatus === "FRESH") {
    score += 20;
  }

  if (item.expirationStatus === "NO_EXPIRATION") {
    score += 10;
  }

  if (item.expirationStatus === "EXPIRED") {
    score -= 80;
  }

  if (item.stockStatus === "LOW") {
    score += 18;
  }

  if (item.stockStatus === "ENOUGH") {
    score += 10;
  }

  if (item.stockStatus === "FULL") {
    score += 6;
  }

  if (item.stockStatus === "OUT_OF_STOCK") {
    score -= 50;
  }

  return score;
}

@Injectable()
export class GoodsService {
  private readonly openAiApiKey = process.env.OPENAI_API_KEY?.trim() ?? null;
  private readonly advisorCache = new Map<string, GoodsAdvisorCacheEntry>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiUsageService: AiUsageService,
    private readonly aiThreadService: AiThreadService
  ) {}

  private async requireUser(userId: string) {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        coupleBind: {
          select: {
            coupleId: true
          }
        }
      }
    });

    if (!user) {
      throw new UnauthorizedException("Invalid token");
    }

    return user;
  }

  private async findPersonalCoupleId(userId: string) {
    const personalWorkspace = await this.prisma.client.couple.findFirst({
      where: {
        createdById: userId,
        name: "Personal workspace",
        memberships: {
          some: {
            userId
          }
        }
      },
      orderBy: {
        createdAt: "asc"
      },
      select: {
        id: true
      }
    });

    return personalWorkspace?.id ?? null;
  }

  private async resolveActiveCoupleId(userId: string, createIfMissing: boolean) {
    const bind = await this.prisma.client.coupleBind.findUnique({
      where: { userId },
      select: { coupleId: true }
    });

    if (bind?.coupleId) {
      return bind.coupleId;
    }

    const personalCoupleId = await this.findPersonalCoupleId(userId);
    if (personalCoupleId) {
      return personalCoupleId;
    }

    if (!createIfMissing) {
      return null;
    }

    const couple = await this.prisma.client.couple.create({
      data: {
        name: "Personal workspace",
        createdById: userId,
        memberships: {
          create: {
            userId,
            role: "OWNER"
          }
        }
      },
      select: {
        id: true
      }
    });

    return couple.id;
  }

  private async assertMembership(userId: string, coupleId: string) {
    const membership = await this.prisma.client.membership.findUnique({
      where: {
        userId_coupleId: {
          userId,
          coupleId
        }
      },
      select: {
        id: true
      }
    });

    if (!membership) {
      throw new BadRequestException("User is not linked to this workspace");
    }
  }

  private async getWorkspaceContext(userId: string, createIfMissing: boolean) {
    const user = await this.requireUser(userId);
    const coupleId = await this.resolveActiveCoupleId(userId, createIfMissing);

    if (!coupleId) {
      throw new BadRequestException("Goods workspace is not available");
    }

    await this.assertMembership(userId, coupleId);

    const workspace = await this.prisma.client.couple.findUnique({
      where: { id: coupleId },
      select: {
        id: true,
        name: true
      }
    });

    if (!workspace) {
      throw new BadRequestException("Workspace was not found");
    }

    return {
      coupleId,
      workspaceName: workspace.name,
      hasPartnerConnection: Boolean(user.coupleBind?.coupleId)
    };
  }

  private buildScopeAccessWhere(userId: string) {
    return {
      OR: [{ scope: "SHARED" as const }, { scope: "PERSONAL" as const, ownerUserId: userId }]
    };
  }

  private async ensureScopeAllowed(scope: GoodsScope, hasPartnerConnection: boolean) {
    if (scope === "SHARED" && !hasPartnerConnection) {
      throw new BadRequestException("Shared goods require an active partner connection");
    }
  }

  private async ensureSeedGoodsCategories(userId: string, coupleId: string, hasPartnerConnection: boolean) {
    const tx = this.prisma.client;
    await this.seedCategoriesForScope(tx, userId, coupleId, "PERSONAL");

    if (hasPartnerConnection) {
      await this.seedCategoriesForScope(tx, userId, coupleId, "SHARED");
    }
  }

  private async seedCategoriesForScope(tx: any, userId: string, coupleId: string, scope: GoodsScope) {
    const ownerUserId = scope === "PERSONAL" ? userId : null;
    const existing = await tx.goodsCategory.findMany({
      where: {
        coupleId,
        scope,
        ownerUserId
      },
      select: {
        normalizedName: true
      }
    });

    const existingNames = new Set(existing.map((item: { normalizedName: string }) => item.normalizedName));
    const missingDefaults = defaultGoodsCategories.filter((name) => !existingNames.has(normalizeGoodsLookupName(name)));

    if (missingDefaults.length === 0) {
      return;
    }

    await tx.goodsCategory.createMany({
      data: missingDefaults.map((name) => ({
        coupleId,
        scope,
        ownerUserId,
        name,
        normalizedName: normalizeGoodsLookupName(name),
        sortOrder: (defaultGoodsCategories.indexOf(name) + 1) * 10,
        isSeeded: true,
        createdById: userId
      }))
    });
  }

  private buildDerivedItem(row: any, now = new Date()) {
    const quantityBase = quantityToNumber(row.quantityBase);
    const lowStockThreshold = quantityToNumber(row.lowStockThreshold);
    const targetQuantity = quantityToNumber(row.targetQuantity);
    const ratePerHour = row.consumptionRatePerHour == null ? null : quantityToNumber(row.consumptionRatePerHour);
    const effectiveQuantity = computeProjectedQuantity(quantityBase, row.quantityBaseAsOf, ratePerHour, now);
    const stockStatus = computeStockStatus(effectiveQuantity, lowStockThreshold, targetQuantity);
    const expirationState = computeExpirationState(row.expirationDate, now);
    const estimatedRunOutAt = computeEstimatedRunOutAt(effectiveQuantity, ratePerHour, now);
    const latestEvent = row.events?.[0] ?? null;

    return {
      id: row.id,
      scope: row.scope,
      name: row.name,
      note: row.note,
      place: row.place
        ? {
            id: row.place.id,
            name: row.place.name,
            scope: row.place.scope,
            isVisible: row.place.isVisible
          }
        : null,
      category: row.category
        ? {
            id: row.category.id,
            name: row.category.name,
            scope: row.category.scope,
            isVisible: row.category.isVisible
          }
        : null,
      uom: row.uom
        ? {
            id: row.uom.id,
            code: row.uom.code,
            label: row.uom.label,
            decimals: row.uom.decimals,
            groupKey: row.uom.groupKey,
            isActive: row.uom.isActive
          }
        : null,
      quantityBase,
      effectiveQuantity,
      lowStockThreshold,
      targetQuantity,
      consumptionRateValue: row.consumptionRateValue == null ? null : quantityToNumber(row.consumptionRateValue),
      consumptionRateUnit: row.consumptionRateUnit,
      consumptionRatePerHour: ratePerHour,
      consumptionStartedAt: row.consumptionStartedAt ? row.consumptionStartedAt.toISOString() : null,
      expirationDate: expirationState.expirationDate,
      expirationStatus: expirationState.expirationStatus,
      daysUntilExpiry: expirationState.daysUntilExpiry,
      stockStatus,
      estimatedRunOutAt,
      isArchived: row.isArchived,
      lastStockEventAt: row.lastStockEventAt.toISOString(),
      lastManualEventAt: row.lastManualEventAt ? row.lastManualEventAt.toISOString() : null,
      updatedAt: row.updatedAt.toISOString(),
      latestEvent: latestEvent
        ? {
            id: latestEvent.id,
            eventType: latestEvent.eventType,
            occurredAt: latestEvent.occurredAt.toISOString(),
            quantityDelta: quantityToNumber(latestEvent.quantityDelta),
            quantityAfter: quantityToNumber(latestEvent.quantityAfter),
            reason: latestEvent.reason,
            source: latestEvent.source
          }
        : null
    };
  }

  private async getAccessibleCatalog(userId: string, coupleId: string) {
    const accessWhere = this.buildScopeAccessWhere(userId);
    const [places, categories, uoms] = await Promise.all([
      this.prisma.client.goodsPlace.findMany({
        where: {
          coupleId,
          isArchived: false,
          ...accessWhere
        },
        orderBy: [{ scope: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
        select: {
          id: true,
          scope: true,
          name: true,
          sortOrder: true,
          isVisible: true
        }
      }),
      this.prisma.client.goodsCategory.findMany({
        where: {
          coupleId,
          isArchived: false,
          ...accessWhere
        },
        orderBy: [{ scope: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
        select: {
          id: true,
          scope: true,
          name: true,
          sortOrder: true,
          isVisible: true,
          isSeeded: true
        }
      }),
      this.prisma.client.goodsUom.findMany({
        where: {
          isActive: true
        },
        orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
        select: {
          id: true,
          code: true,
          label: true,
          groupKey: true,
          decimals: true,
          isActive: true
        }
      })
    ]);

    return {
      places,
      categories,
      uoms
    };
  }

  private async getAccessibleItemRow(userId: string, coupleId: string, id: string, tx: any = this.prisma.client) {
    const item = await tx.goodsItem.findFirst({
      where: {
        id,
        coupleId,
        ...this.buildScopeAccessWhere(userId)
      },
      include: {
        place: {
          select: {
            id: true,
            name: true,
            scope: true,
            isVisible: true
          }
        },
        category: {
          select: {
            id: true,
            name: true,
            scope: true,
            isVisible: true
          }
        },
        uom: {
          select: {
            id: true,
            code: true,
            label: true,
            decimals: true,
            groupKey: true,
            isActive: true
          }
        },
        events: {
          orderBy: {
            occurredAt: "desc"
          },
          take: 1,
          select: {
            id: true,
            eventType: true,
            occurredAt: true,
            quantityDelta: true,
            quantityAfter: true,
            reason: true,
            source: true
          }
        }
      }
    });

    if (!item) {
      throw new BadRequestException("Goods item not found");
    }

    return item;
  }

  private async requireAccessiblePlace(
    userId: string,
    coupleId: string,
    placeId: string,
    scope: GoodsScope,
    tx: any = this.prisma.client,
    options?: { allowHiddenId?: string | null }
  ) {
    const place = await tx.goodsPlace.findFirst({
      where: {
        id: placeId,
        coupleId,
        scope,
        isArchived: false,
        ...(scope === "PERSONAL" ? { ownerUserId: userId } : {})
      },
      select: {
        id: true,
        isVisible: true
      }
    });

    if (!place) {
      throw new BadRequestException("Selected place is not available");
    }

    if (!place.isVisible && options?.allowHiddenId !== placeId) {
      throw new BadRequestException("Selected place is hidden. Show it first or choose a different place.");
    }

    return place;
  }

  private async requireAccessibleCategory(
    userId: string,
    coupleId: string,
    categoryId: string,
    scope: GoodsScope,
    tx: any = this.prisma.client,
    options?: { allowHiddenId?: string | null }
  ) {
    const category = await tx.goodsCategory.findFirst({
      where: {
        id: categoryId,
        coupleId,
        scope,
        isArchived: false,
        ...(scope === "PERSONAL" ? { ownerUserId: userId } : {})
      },
      select: {
        id: true,
        isVisible: true
      }
    });

    if (!category) {
      throw new BadRequestException("Selected category is not available");
    }

    if (!category.isVisible && options?.allowHiddenId !== categoryId) {
      throw new BadRequestException("Selected category is hidden. Show it first or choose a different category.");
    }

    return category;
  }

  private async findManageablePlace(userId: string, coupleId: string, id: string) {
    return this.prisma.client.goodsPlace.findFirst({
      where: {
        id,
        coupleId,
        isArchived: false,
        ...this.buildScopeAccessWhere(userId)
      },
      select: {
        id: true,
        scope: true,
        name: true,
        sortOrder: true,
        isVisible: true
      }
    });
  }

  private async findManageableCategory(userId: string, coupleId: string, id: string) {
    return this.prisma.client.goodsCategory.findFirst({
      where: {
        id,
        coupleId,
        isArchived: false,
        ...this.buildScopeAccessWhere(userId)
      },
      select: {
        id: true,
        scope: true,
        name: true,
        sortOrder: true,
        isVisible: true,
        isSeeded: true
      }
    });
  }

  private async requireUom(uomId: string, tx: any = this.prisma.client) {
    const uom = await tx.goodsUom.findUnique({
      where: { id: uomId },
      select: {
        id: true,
        isActive: true
      }
    });

    if (!uom || !uom.isActive) {
      throw new BadRequestException("Selected unit of measure is not available");
    }

    return uom;
  }

  private async materializeAutoConsumption(tx: any, itemId: string, userId: string) {
    const item = await tx.goodsItem.findUnique({
      where: { id: itemId },
      select: {
        id: true,
        quantityBase: true,
        quantityBaseAsOf: true,
        consumptionRatePerHour: true
      }
    });

    if (!item) {
      throw new BadRequestException("Goods item not found");
    }

    const baseQuantity = quantityToNumber(item.quantityBase);
    const ratePerHour = item.consumptionRatePerHour == null ? null : quantityToNumber(item.consumptionRatePerHour);
    const now = new Date();
    const effectiveQuantity = computeProjectedQuantity(baseQuantity, item.quantityBaseAsOf, ratePerHour, now);
    const consumedAmount = roundQuantity(baseQuantity - effectiveQuantity);

    if (!ratePerHour || consumedAmount <= 0) {
      return {
        quantityBase: baseQuantity,
        quantityBaseAsOf: item.quantityBaseAsOf,
        asOf: now
      };
    }

    await tx.goodsItemEvent.create({
      data: {
        goodsItemId: item.id,
        eventType: "AUTO_CONSUMED",
        quantityDelta: serializeQuantity(-consumedAmount),
        quantityAfter: serializeQuantity(effectiveQuantity),
        occurredAt: now,
        createdById: userId,
        source: "SYSTEM",
        reason: "Elapsed auto-consumption was materialized before a manual update"
      }
    });

    await tx.goodsItem.update({
      where: { id: item.id },
      data: {
        quantityBase: serializeQuantity(effectiveQuantity),
        quantityBaseAsOf: now,
        lastStockEventAt: now
      }
    });

    return {
      quantityBase: effectiveQuantity,
      quantityBaseAsOf: now,
      asOf: now
    };
  }

  private buildEventResponse(event: any) {
    return {
      id: event.id,
      eventType: event.eventType,
      quantityDelta: quantityToNumber(event.quantityDelta),
      quantityAfter: quantityToNumber(event.quantityAfter),
      occurredAt: event.occurredAt.toISOString(),
      source: event.source,
      reason: event.reason,
      metadata: event.metadata,
      createdAt: event.createdAt.toISOString(),
      createdBy: event.createdBy
        ? {
            id: event.createdBy.id,
            firstName: event.createdBy.firstName,
            username: event.createdBy.username
          }
        : null
    };
  }

  private buildAdvisorScopeWhere(userId: string, scope: GoodsAdvisorScope) {
    if (scope === "PERSONAL") {
      return {
        scope: "PERSONAL" as const,
        ownerUserId: userId
      };
    }

    if (scope === "SHARED") {
      return {
        scope: "SHARED" as const
      };
    }

    return this.buildScopeAccessWhere(userId);
  }

  private buildRecipePreview(title: string, sourceType: GoodsAdvisorRecipePreviewType = "youtube_search") {
    const query = encodeURIComponent(`${title} recipe`);
    const url =
      sourceType === "image_search"
        ? `https://www.google.com/search?tbm=isch&q=${query}`
        : `https://www.youtube.com/results?search_query=${query}`;

    return {
      label: "See recipe",
      url,
      sourceType,
      sourceLabel: sourceType === "image_search" ? "Image search" : "YouTube"
    } satisfies GoodsDinnerRecipeSuggestion["recipePreview"];
  }

  private withRecipePreview(recipe: Omit<GoodsDinnerRecipeSuggestion, "recipePreview">): GoodsDinnerRecipeSuggestion {
    return {
      ...recipe,
      recipePreview: this.buildRecipePreview(recipe.title)
    };
  }

  private pruneAdvisorCache(now = Date.now()) {
    for (const [key, entry] of this.advisorCache.entries()) {
      if (entry.expiresAt <= now) {
        this.advisorCache.delete(key);
      }
    }
  }

  private getCachedAdvisorResponse<T>(cacheKey: string) {
    this.pruneAdvisorCache();
    const entry = this.advisorCache.get(cacheKey);
    if (!entry || entry.expiresAt <= Date.now()) {
      if (entry) {
        this.advisorCache.delete(cacheKey);
      }

      return null;
    }

    return entry.response as T;
  }

  private setCachedAdvisorResponse<T>(cacheKey: string, response: T) {
    this.pruneAdvisorCache();
    this.advisorCache.set(cacheKey, {
      expiresAt: Date.now() + GOODS_ADVISOR_CACHE_TTL_MS,
      response
    });
  }

  private buildAdvisorFingerprint(items: GoodsAdvisorCompactItem[]) {
    return createHash("sha256").update(JSON.stringify(items)).digest("hex");
  }

  private buildAdvisorPantryContext(items: GoodsAdvisorCompactItem[]) {
    if (!items.length) {
      return "Pantry items: none. There are no tracked goods yet.";
    }

    return [
      "Pantry items:",
      ...items.map((item, index) => {
        const parts = [
          `${index + 1}. ${item.name}`,
          `qty ${item.quantityLabel}`,
          item.categoryName ? `category ${item.categoryName}` : null,
          `stock ${item.stockStatus}`,
          `freshness ${item.expirationStatus}`,
          item.daysUntilExpiry == null ? null : `daysUntilExpiry ${item.daysUntilExpiry}`
        ].filter(Boolean);

        return parts.join(" | ");
      })
    ].join("\n");
  }

  private buildRecentConversationContext(messages: Array<{ role: string; text: string }>) {
    if (!messages.length) {
      return "No recent conversation yet.";
    }

    return messages
      .map((message) => `${message.role === "USER" ? "User" : message.role === "ASSISTANT" ? "Assistant" : "System"}: ${trimText(message.text, 280)}`)
      .join("\n");
  }

  private buildAdvisorTextResponse(
    mode: Exclude<GoodsAdvisorResponseMode, "DINNER_RECOMMENDATION">,
    assistantMessage: string,
    warnings: string[] = []
  ): GoodsDinnerAdvisorResponse {
    return {
      mode,
      assistantMessage,
      pantryMeals: [],
      minimalBuyMeal: null,
      warnings
    };
  }

  private normalizeAdvisorThreadScope(scope?: string | null): GoodsAdvisorScope {
    if (scope === "PERSONAL" || scope === "SHARED") {
      return scope;
    }

    return "AUTO";
  }

  private async getAdvisorCompactItems(userId: string, coupleId: string, scope: GoodsAdvisorScope) {
    const rows = await this.prisma.client.goodsItem.findMany({
      where: {
        coupleId,
        isArchived: false,
        ...this.buildAdvisorScopeWhere(userId, scope)
      },
      include: {
        place: { select: { id: true, name: true, scope: true, isVisible: true } },
        category: { select: { id: true, name: true, scope: true, isVisible: true } },
        uom: { select: { id: true, code: true, label: true, decimals: true, groupKey: true, isActive: true } },
        events: {
          orderBy: { occurredAt: "desc" },
          take: 1,
          select: {
            id: true,
            eventType: true,
            occurredAt: true,
            quantityDelta: true,
            quantityAfter: true,
            reason: true,
            source: true
          }
        }
      },
      orderBy: [{ lastStockEventAt: "desc" }, { name: "asc" }]
    });

    const now = new Date();
    const items = rows
      .map((row) => this.buildDerivedItem(row, now))
      .map((item) => ({
        item,
        normalizedName: normalizeGoodsLookupName(item.name),
        quantityLabel: `${formatAdvisorQuantity(item.effectiveQuantity, item.uom?.decimals ?? 0)} ${item.uom?.code ?? "unit"}`.trim(),
        score: buildCompactItemScore(item)
      }))
      .sort((left, right) => right.score - left.score || left.item.name.localeCompare(right.item.name));

    const merged = new Map<string, GoodsAdvisorCompactItem & { quantityLabels: string[] }>();

    for (const entry of items) {
      const existing = merged.get(entry.normalizedName);
      if (!existing) {
        merged.set(entry.normalizedName, {
          name: trimText(entry.item.name, 40),
          quantityLabel: entry.quantityLabel,
          quantityLabels: [entry.quantityLabel],
          categoryName: entry.item.category?.name ? trimText(entry.item.category.name, 30) : null,
          expirationStatus: entry.item.expirationStatus,
          daysUntilExpiry: entry.item.daysUntilExpiry,
          stockStatus: entry.item.stockStatus,
          score: entry.score
        });
        continue;
      }

      if (existing.quantityLabels.length < 2 && !existing.quantityLabels.includes(entry.quantityLabel)) {
        existing.quantityLabels.push(entry.quantityLabel);
        existing.quantityLabel = existing.quantityLabels.join(" + ");
      }

      if (expirationRank(entry.item.expirationStatus) < expirationRank(existing.expirationStatus)) {
        existing.expirationStatus = entry.item.expirationStatus;
      }

      if (stockRank(entry.item.stockStatus) < stockRank(existing.stockStatus)) {
        existing.stockStatus = entry.item.stockStatus;
      }

      if (entry.item.daysUntilExpiry != null) {
        existing.daysUntilExpiry =
          existing.daysUntilExpiry == null ? entry.item.daysUntilExpiry : Math.min(existing.daysUntilExpiry, entry.item.daysUntilExpiry);
      }

      existing.score = Math.max(existing.score, entry.score);
      if (!existing.categoryName && entry.item.category?.name) {
        existing.categoryName = trimText(entry.item.category.name, 30);
      }
    }

    return Array.from(merged.values())
      .map(({ quantityLabels: _quantityLabels, ...item }) => ({
        ...item,
        quantityLabel: trimText(item.quantityLabel, 40)
      }))
      .sort((left, right) => right.score - left.score || left.name.localeCompare(right.name))
      .slice(0, GOODS_ADVISOR_ITEM_CAP);
  }

  async snapshot(userId: string) {
    const workspace = await this.getWorkspaceContext(userId, true);
    await this.ensureSeedGoodsCategories(userId, workspace.coupleId, workspace.hasPartnerConnection);
    const catalog = await this.getAccessibleCatalog(userId, workspace.coupleId);

    const rows = await this.prisma.client.goodsItem.findMany({
      where: {
        coupleId: workspace.coupleId,
        isArchived: false,
        ...this.buildScopeAccessWhere(userId)
      },
      include: {
        place: { select: { id: true, name: true, scope: true, isVisible: true } },
        category: { select: { id: true, name: true, scope: true, isVisible: true } },
        uom: { select: { id: true, code: true, label: true, decimals: true, groupKey: true, isActive: true } },
        events: {
          orderBy: { occurredAt: "desc" },
          take: 1,
          select: {
            id: true,
            eventType: true,
            occurredAt: true,
            quantityDelta: true,
            quantityAfter: true,
            reason: true,
            source: true
          }
        }
      },
      orderBy: [{ lastStockEventAt: "desc" }, { name: "asc" }]
    });

    const now = new Date();
    const items = rows.map((row) => this.buildDerivedItem(row, now));
    const attentionItems = items
      .filter((item) => item.stockStatus === "LOW" || item.stockStatus === "OUT_OF_STOCK" || item.expirationStatus === "EXPIRING_SOON" || item.expirationStatus === "EXPIRED")
      .sort((a, b) => b.lastStockEventAt.localeCompare(a.lastStockEventAt))
      .slice(0, 8);
    const runOutSoon = items
      .filter((item) => item.estimatedRunOutAt)
      .sort((a, b) => (a.estimatedRunOutAt ?? "").localeCompare(b.estimatedRunOutAt ?? ""))
      .slice(0, 8);

    const byPlace = catalog.places.map((place) => {
      const scopedItems = items.filter((item) => item.place?.id === place.id);
      return {
        ...place,
        itemCount: scopedItems.length,
        lowCount: scopedItems.filter((item) => item.stockStatus === "LOW").length,
        outCount: scopedItems.filter((item) => item.stockStatus === "OUT_OF_STOCK").length,
        expiringCount: scopedItems.filter((item) => item.expirationStatus === "EXPIRING_SOON" || item.expirationStatus === "EXPIRED").length
      };
    });

    const byCategory = catalog.categories.map((category) => {
      const scopedItems = items.filter((item) => item.category?.id === category.id);
      return {
        ...category,
        itemCount: scopedItems.length,
        lowCount: scopedItems.filter((item) => item.stockStatus === "LOW").length,
        outCount: scopedItems.filter((item) => item.stockStatus === "OUT_OF_STOCK").length,
        expiringCount: scopedItems.filter((item) => item.expirationStatus === "EXPIRING_SOON" || item.expirationStatus === "EXPIRED").length
      };
    });

    const recentEvents = await this.prisma.client.goodsItemEvent.findMany({
      where: {
        goodsItem: {
          coupleId: workspace.coupleId,
          isArchived: false,
          ...this.buildScopeAccessWhere(userId)
        }
      },
      orderBy: { occurredAt: "desc" },
      take: 12,
      include: {
        goodsItem: {
          select: {
            id: true,
            name: true
          }
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            username: true
          }
        }
      }
    });

    return {
      workspace: {
        coupleId: workspace.coupleId,
        name: workspace.workspaceName,
        hasPartnerConnection: workspace.hasPartnerConnection
      },
      metrics: {
        activeItems: items.length,
        lowStockItems: items.filter((item) => item.stockStatus === "LOW").length,
        outOfStockItems: items.filter((item) => item.stockStatus === "OUT_OF_STOCK").length,
        expiringSoonItems: items.filter((item) => item.expirationStatus === "EXPIRING_SOON").length,
        expiredItems: items.filter((item) => item.expirationStatus === "EXPIRED").length,
        recentlyUpdatedItems: items.filter((item) => Date.parse(item.lastStockEventAt) >= now.getTime() - 7 * 86400000).length
      },
      highlights: {
        attentionItems,
        runOutSoon,
        recentChanges: recentEvents.map((event) => ({
          ...this.buildEventResponse(event),
          item: event.goodsItem
        }))
      },
      breakdown: {
        byPlace,
        byCategory
      },
      catalog
    };
  }

  private async generateDinnerAdvice(params: {
    userId: string;
    coupleId: string;
    scope: GoodsAdvisorScope;
    message: string;
    summaryText?: string | null;
    recentMessages?: Array<{ role: string; text: string }>;
    aiThreadId?: string | null;
    cacheScopeKey: string;
  }): Promise<GoodsDinnerAdvisorResponse> {
    if (!this.openAiApiKey) {
      throw new ServiceUnavailableException("AI dinner advisor is not configured on this server");
    }

    const message = normalizeGoodsName(params.message ?? "");
    if (!message) {
      throw new BadRequestException("Enter a dinner question first");
    }

    const compactItems = await this.getAdvisorCompactItems(params.userId, params.coupleId, params.scope);
    const pantryState = buildAdvisorPantryState(compactItems);
    const intent = detectAdvisorIntent({
      message,
      recentMessages: params.recentMessages,
      summaryText: params.summaryText
    });
    const usableCompactItems = compactItems.filter((item) => isUsableAdvisorItem(item));
    const pantryFingerprint = this.buildAdvisorFingerprint(intent === "DINNER_RECOMMENDATION" ? usableCompactItems : compactItems);
    const recentConversation = this.buildRecentConversationContext(params.recentMessages ?? []);
    const contextFingerprint = createHash("sha256")
      .update(`${params.summaryText ?? ""}|${recentConversation}`)
      .digest("hex");
    const cacheKey = `${params.cacheScopeKey}:${intent}:${normalizeCacheText(message)}:${pantryFingerprint}:${contextFingerprint}`;
    const cached = this.getCachedAdvisorResponse<GoodsDinnerAdvisorResponse>(cacheKey);
    if (cached) {
      return cached;
    }

    if (intent !== "RECEIPT_FOLLOW_UP" && !pantryState.hasAnyItems) {
      const response = this.buildAdvisorTextResponse(
        "NEEDS_ITEMS",
        "I do not see any goods in your pantry yet. Add a few items first, then I can help with meals or pantry questions."
      );
      this.setCachedAdvisorResponse(cacheKey, response);
      return response;
    }

    if (intent === "DINNER_RECOMMENDATION" && !pantryState.hasUsableItems) {
      const response = this.buildAdvisorTextResponse(
        "NEEDS_PURCHASE",
        "I cannot suggest a safe meal from the current pantry because the available items are expired or unusable. Please purchase fresh ingredients first."
      );
      this.setCachedAdvisorResponse(cacheKey, response);
      return response;
    }

    const hasReceiptContext = /\b(receipt|bill|invoice|subtotal|total|food receipt)\b/i.test(
      `${params.summaryText ?? ""}\n${recentConversation}`
    );
    if (intent === "RECEIPT_FOLLOW_UP" && !hasReceiptContext) {
      const response = this.buildAdvisorTextResponse(
        "RECEIPT_FOLLOW_UP",
        "I do not have that food receipt in this conversation yet. Paste the receipt details here and I can help you continue from it."
      );
      this.setCachedAdvisorResponse(cacheKey, response);
      return response;
    }

    const correlationId = randomUUID();
    const pricing = await this.aiUsageService.getModelPricing(OPENAI_GOODS_ADVISOR_MODEL);
    const pantryContext = this.buildAdvisorPantryContext(intent === "DINNER_RECOMMENDATION" ? usableCompactItems : compactItems);

    try {
      const advice = await requestGoodsDinnerAdvice({
        apiKey: this.openAiApiKey,
        userMessage: trimText(message, 240),
        pantryContext,
        summaryText: params.summaryText,
        recentConversation
      });

      await this.aiUsageService.log({
        provider: "OPENAI",
        feature: "GOODS_ADVISOR",
        operation: "DINNER_ADVICE",
        status: "SUCCESS",
        model: OPENAI_GOODS_ADVISOR_MODEL,
        endpoint: "/v1/responses",
        correlationId,
        providerRequestId: advice.providerRequestId,
        userId: params.userId,
        coupleId: params.coupleId,
        aiThreadId: params.aiThreadId ?? null,
        usage: advice.usage,
        pricing
      });

      const response: GoodsDinnerAdvisorResponse =
        advice.draft.mode === "DINNER_RECOMMENDATION"
          ? {
              mode: "DINNER_RECOMMENDATION",
              assistantMessage: advice.draft.assistantMessage,
              pantryMeals: [
                this.withRecipePreview(advice.draft.pantryMeals[0]),
                this.withRecipePreview(advice.draft.pantryMeals[1])
              ],
              minimalBuyMeal: this.withRecipePreview(advice.draft.minimalBuyMeal),
              warnings: advice.draft.warnings
            }
          : {
              mode: advice.draft.mode,
              assistantMessage: advice.draft.assistantMessage,
              pantryMeals: [],
              minimalBuyMeal: null,
              warnings: advice.draft.warnings
            };

      this.setCachedAdvisorResponse(cacheKey, response);
      return response;
    } catch (error) {
      await this.aiUsageService.log({
        provider: "OPENAI",
        feature: "GOODS_ADVISOR",
        operation: "DINNER_ADVICE",
        status: "ERROR",
        model: OPENAI_GOODS_ADVISOR_MODEL,
        endpoint: "/v1/responses",
        correlationId,
        providerRequestId: error instanceof OpenAiRequestError ? error.details?.providerRequestId ?? null : null,
        userId: params.userId,
        coupleId: params.coupleId,
        aiThreadId: params.aiThreadId ?? null,
        usage: error instanceof OpenAiRequestError ? error.details?.usage ?? null : null,
        pricing,
        errorMessage: error instanceof Error ? error.message : "Unknown dinner advisor error"
      });
      throw error;
    }
  }

  async requestDinnerAdvice(userId: string, dto: GoodsDinnerAdvisorDto): Promise<GoodsDinnerAdvisorResponse> {
    const workspace = await this.getWorkspaceContext(userId, true);
    await this.ensureSeedGoodsCategories(userId, workspace.coupleId, workspace.hasPartnerConnection);
    const requestedScope = this.normalizeAdvisorThreadScope(dto.scope);

    if (requestedScope === "SHARED" && !workspace.hasPartnerConnection) {
      throw new BadRequestException("Shared dinner advice requires an active partner connection");
    }

    return this.generateDinnerAdvice({
      userId,
      coupleId: workspace.coupleId,
      scope: requestedScope,
      message: dto.message,
      cacheScopeKey: `${userId}:${requestedScope}`
    });
  }

  async listAdvisorThreads(userId: string) {
    await this.getWorkspaceContext(userId, true);
    return this.aiThreadService.listThreads(userId, "GOODS_ADVISOR");
  }

  async createAdvisorThread(userId: string, dto: CreateGoodsAdvisorThreadDto) {
    const workspace = await this.getWorkspaceContext(userId, true);
    const scope = this.normalizeAdvisorThreadScope(dto.scope);
    if (scope === "SHARED" && !workspace.hasPartnerConnection) {
      throw new BadRequestException("Shared dinner advice requires an active partner connection");
    }

    return this.aiThreadService.createThread({
      userId,
      coupleId: workspace.coupleId,
      feature: "GOODS_ADVISOR",
      scope
    });
  }

  async getAdvisorThread(userId: string, threadId: string) {
    await this.getWorkspaceContext(userId, true);
    return this.aiThreadService.getThreadWithMessages({
      userId,
      feature: "GOODS_ADVISOR",
      threadId
    });
  }

  async updateAdvisorThread(userId: string, threadId: string, dto: UpdateGoodsAdvisorThreadDto) {
    const workspace = await this.getWorkspaceContext(userId, true);
    const scope = dto.scope === undefined ? undefined : this.normalizeAdvisorThreadScope(dto.scope);
    if (scope === "SHARED" && !workspace.hasPartnerConnection) {
      throw new BadRequestException("Shared dinner advice requires an active partner connection");
    }

    return this.aiThreadService.updateThread({
      userId,
      feature: "GOODS_ADVISOR",
      threadId,
      title: dto.title,
      isPinned: dto.isPinned,
      scope
    });
  }

  async deleteAdvisorThread(userId: string, threadId: string) {
    await this.getWorkspaceContext(userId, true);
    return this.aiThreadService.deleteThread({
      userId,
      feature: "GOODS_ADVISOR",
      threadId
    });
  }

  async sendAdvisorThreadMessage(userId: string, threadId: string, dto: CreateGoodsAdvisorMessageDto) {
    const workspace = await this.getWorkspaceContext(userId, true);
    await this.ensureSeedGoodsCategories(userId, workspace.coupleId, workspace.hasPartnerConnection);
    const normalizedMessage = normalizeGoodsName(dto.message ?? "");
    if (!normalizedMessage) {
      throw new BadRequestException("Enter a dinner question first");
    }

    const conversation = await this.aiThreadService.getConversationContext({
      userId,
      feature: "GOODS_ADVISOR",
      threadId
    });
    const scope = this.normalizeAdvisorThreadScope(conversation.thread.scope);

    if (scope === "SHARED" && !workspace.hasPartnerConnection) {
      throw new BadRequestException("Shared dinner advice requires an active partner connection");
    }

    const advice = await this.generateDinnerAdvice({
      userId,
      coupleId: conversation.thread.coupleId ?? workspace.coupleId,
      scope,
      message: normalizedMessage,
      summaryText: conversation.summaryText,
      recentMessages: conversation.recentMessages,
      aiThreadId: threadId,
      cacheScopeKey: `${threadId}:${scope}`
    });

    const userMessage = await this.aiThreadService.appendMessage({
      threadId,
      role: "USER",
      text: normalizedMessage,
      userId
    });
    const assistantMessage = await this.aiThreadService.appendMessage({
      threadId,
      role: "ASSISTANT",
      text: advice.assistantMessage,
      payload: advice
    });
    await this.aiThreadService.rebuildSummary(threadId);
    const thread = await this.aiThreadService.getThreadWithMessages({
      userId,
      feature: "GOODS_ADVISOR",
      threadId
    });

    return {
      thread: thread.thread,
      userMessage,
      assistantMessage
    };
  }

  async listItems(userId: string, query: GoodsListQueryDto) {
    const workspace = await this.getWorkspaceContext(userId, true);
    await this.ensureSeedGoodsCategories(userId, workspace.coupleId, workspace.hasPartnerConnection);

    const rows = await this.prisma.client.goodsItem.findMany({
      where: {
        coupleId: workspace.coupleId,
        isArchived: false,
        ...this.buildScopeAccessWhere(userId)
      },
      include: {
        place: { select: { id: true, name: true, scope: true, isVisible: true } },
        category: { select: { id: true, name: true, scope: true, isVisible: true } },
        uom: { select: { id: true, code: true, label: true, decimals: true, groupKey: true, isActive: true } },
        events: {
          orderBy: { occurredAt: "desc" },
          take: 1,
          select: {
            id: true,
            eventType: true,
            occurredAt: true,
            quantityDelta: true,
            quantityAfter: true,
            reason: true,
            source: true
          }
        }
      }
    });

    const now = new Date();
    let items = rows.map((row) => this.buildDerivedItem(row, now));
    const normalizedSearch = query.search ? normalizeGoodsLookupName(query.search) : "";

    if (query.placeId) {
      items = items.filter((item) => item.place?.id === query.placeId);
    }

    if (query.categoryId) {
      items = items.filter((item) => item.category?.id === query.categoryId);
    }

    if (query.scope) {
      items = items.filter((item) => item.scope === query.scope);
    }

    if (query.stockStatus) {
      items = items.filter((item) => item.stockStatus === query.stockStatus);
    }

    if (query.expirationStatus) {
      items = items.filter((item) => item.expirationStatus === query.expirationStatus);
    }

    if (query.lowOnly) {
      items = items.filter((item) => item.stockStatus === "LOW" || item.stockStatus === "OUT_OF_STOCK");
    }

    if (query.recentlyUpdatedOnly) {
      items = items.filter((item) => Date.parse(item.lastStockEventAt) >= now.getTime() - 7 * 86400000);
    }

    if (query.autoConsumptionOnly) {
      items = items.filter((item) => item.consumptionRateUnit !== "PERMANENT" && (item.consumptionRateValue ?? 0) > 0);
    }

    if (normalizedSearch) {
      items = items.filter((item) => [item.name, item.note ?? "", item.place?.name ?? "", item.category?.name ?? ""].some((value) => normalizeGoodsLookupName(value).includes(normalizedSearch)));
    }

    const sort = query.sort ?? "RECENTLY_UPDATED";
    items.sort((left, right) => {
      if (sort === "EXPIRATION_ASC") {
        return (left.expirationDate ?? "9999").localeCompare(right.expirationDate ?? "9999") || left.name.localeCompare(right.name);
      }

      if (sort === "RUN_OUT_ASC") {
        return (left.estimatedRunOutAt ?? "9999").localeCompare(right.estimatedRunOutAt ?? "9999") || left.name.localeCompare(right.name);
      }

      if (sort === "LOW_QUANTITY") {
        return left.effectiveQuantity - left.lowStockThreshold - (right.effectiveQuantity - right.lowStockThreshold) || left.name.localeCompare(right.name);
      }

      if (sort === "NAME") {
        return left.name.localeCompare(right.name);
      }

      if (sort === "PLACE") {
        return (left.place?.name ?? "").localeCompare(right.place?.name ?? "") || left.name.localeCompare(right.name);
      }

      if (sort === "CATEGORY") {
        return (left.category?.name ?? "").localeCompare(right.category?.name ?? "") || left.name.localeCompare(right.name);
      }

      return right.lastStockEventAt.localeCompare(left.lastStockEventAt) || left.name.localeCompare(right.name);
    });

    const pageSize = Math.min(Math.max(query.pageSize ?? 20, 1), 100);
    const totalItems = items.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const page = Math.min(Math.max(query.page ?? 1, 1), totalPages);
    const startIndex = (page - 1) * pageSize;

    return {
      items: items.slice(startIndex, startIndex + pageSize),
      page,
      pageSize,
      totalItems,
      totalPages,
      filter: {
        ...query,
        sort
      }
    };
  }

  async itemDetail(userId: string, id: string) {
    const workspace = await this.getWorkspaceContext(userId, false);
    const item = await this.getAccessibleItemRow(userId, workspace.coupleId, id);
    return this.buildDerivedItem(item);
  }

  async itemEvents(userId: string, id: string) {
    const workspace = await this.getWorkspaceContext(userId, false);
    await this.getAccessibleItemRow(userId, workspace.coupleId, id);

    const events = await this.prisma.client.goodsItemEvent.findMany({
      where: {
        goodsItemId: id
      },
      orderBy: {
        occurredAt: "desc"
      },
      take: 100,
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            username: true
          }
        }
      }
    });

    return {
      items: events.map((event) => this.buildEventResponse(event))
    };
  }

  async listPlaces(userId: string) {
    const workspace = await this.getWorkspaceContext(userId, true);
    const places = await this.prisma.client.goodsPlace.findMany({
      where: {
        coupleId: workspace.coupleId,
        isArchived: false,
        ...this.buildScopeAccessWhere(userId)
      },
      orderBy: [{ scope: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        scope: true,
        name: true,
        sortOrder: true,
        isVisible: true,
        _count: {
          select: {
            items: {
              where: {
                isArchived: false
              }
            }
          }
        }
      }
    });

    return {
      items: places.map((place) => ({
        id: place.id,
        scope: place.scope,
        name: place.name,
        sortOrder: place.sortOrder,
        isVisible: place.isVisible,
        itemCount: place._count.items
      }))
    };
  }

  async createPlace(userId: string, dto: CreateGoodsPlaceDto) {
    const workspace = await this.getWorkspaceContext(userId, true);
    await this.ensureScopeAllowed(dto.scope, workspace.hasPartnerConnection);
    const name = normalizeGoodsName(dto.name);
    if (!name) {
      throw new BadRequestException("Place name is required");
    }

    const place = await this.prisma.client.goodsPlace.create({
      data: {
        coupleId: workspace.coupleId,
        scope: dto.scope,
        ownerUserId: dto.scope === "PERSONAL" ? userId : null,
        name,
        normalizedName: normalizeGoodsLookupName(name),
        createdById: userId
      }
    });

    return {
      id: place.id,
      scope: place.scope,
      name: place.name,
      sortOrder: place.sortOrder,
      isVisible: place.isVisible
    };
  }

  async updatePlace(userId: string, id: string, dto: UpdateGoodsPlaceDto) {
    const workspace = await this.getWorkspaceContext(userId, false);
    const existing = await this.findManageablePlace(userId, workspace.coupleId, id);

    if (!existing) {
      throw new BadRequestException("Place not found");
    }

    const name = dto.name ? normalizeGoodsName(dto.name) : existing.name;
    const updated = await this.prisma.client.goodsPlace.update({
      where: { id },
      data: {
        name,
        normalizedName: normalizeGoodsLookupName(name)
      }
    });

    return {
      id: updated.id,
      scope: updated.scope,
      name: updated.name,
      sortOrder: updated.sortOrder,
      isVisible: updated.isVisible
    };
  }

  async updatePlaceVisibility(userId: string, id: string, dto: UpdateGoodsVisibilityDto) {
    const workspace = await this.getWorkspaceContext(userId, false);
    const existing = await this.findManageablePlace(userId, workspace.coupleId, id);

    if (!existing) {
      throw new BadRequestException("Place not found");
    }

    const updated = await this.prisma.client.goodsPlace.update({
      where: { id },
      data: {
        isVisible: dto.isVisible
      }
    });

    return {
      id: updated.id,
      scope: updated.scope,
      name: updated.name,
      sortOrder: updated.sortOrder,
      isVisible: updated.isVisible
    };
  }

  async deletePlace(userId: string, id: string) {
    const workspace = await this.getWorkspaceContext(userId, false);
    const existing = await this.findManageablePlace(userId, workspace.coupleId, id);

    if (!existing) {
      throw new BadRequestException("Place not found");
    }

    const activeItemCount = await this.prisma.client.goodsItem.count({
      where: {
        placeId: id,
        isArchived: false
      }
    });

    if (activeItemCount > 0) {
      throw new BadRequestException("This place still has active goods. Hide it instead or move those goods first.");
    }

    await this.prisma.client.goodsPlace.update({
      where: { id },
      data: {
        isArchived: true
      }
    });

    return {
      success: true
    };
  }

  async archivePlace(userId: string, id: string) {
    return this.deletePlace(userId, id);
  }

  async listCategories(userId: string) {
    const workspace = await this.getWorkspaceContext(userId, true);
    await this.ensureSeedGoodsCategories(userId, workspace.coupleId, workspace.hasPartnerConnection);

    const categories = await this.prisma.client.goodsCategory.findMany({
      where: {
        coupleId: workspace.coupleId,
        isArchived: false,
        ...this.buildScopeAccessWhere(userId)
      },
      orderBy: [{ scope: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        scope: true,
        name: true,
        sortOrder: true,
        isVisible: true,
        isSeeded: true,
        _count: {
          select: {
            items: {
              where: {
                isArchived: false
              }
            }
          }
        }
      }
    });

    return {
      items: categories.map((category) => ({
        id: category.id,
        scope: category.scope,
        name: category.name,
        sortOrder: category.sortOrder,
        isVisible: category.isVisible,
        isSeeded: category.isSeeded,
        itemCount: category._count.items
      }))
    };
  }

  async createCategory(userId: string, dto: CreateGoodsCategoryDto) {
    const workspace = await this.getWorkspaceContext(userId, true);
    await this.ensureScopeAllowed(dto.scope, workspace.hasPartnerConnection);
    const name = normalizeGoodsName(dto.name);
    if (!name) {
      throw new BadRequestException("Category name is required");
    }

    const category = await this.prisma.client.goodsCategory.create({
      data: {
        coupleId: workspace.coupleId,
        scope: dto.scope,
        ownerUserId: dto.scope === "PERSONAL" ? userId : null,
        name,
        normalizedName: normalizeGoodsLookupName(name),
        createdById: userId
      }
    });

    return {
      id: category.id,
      scope: category.scope,
      name: category.name,
      sortOrder: category.sortOrder,
      isVisible: category.isVisible,
      isSeeded: category.isSeeded
    };
  }

  async updateCategory(userId: string, id: string, dto: UpdateGoodsCategoryDto) {
    const workspace = await this.getWorkspaceContext(userId, false);
    const existing = await this.findManageableCategory(userId, workspace.coupleId, id);

    if (!existing) {
      throw new BadRequestException("Category not found");
    }

    const name = dto.name ? normalizeGoodsName(dto.name) : existing.name;
    const updated = await this.prisma.client.goodsCategory.update({
      where: { id },
      data: {
        name,
        normalizedName: normalizeGoodsLookupName(name)
      }
    });

    return {
      id: updated.id,
      scope: updated.scope,
      name: updated.name,
      sortOrder: updated.sortOrder,
      isVisible: updated.isVisible,
      isSeeded: updated.isSeeded
    };
  }

  async updateCategoryVisibility(userId: string, id: string, dto: UpdateGoodsVisibilityDto) {
    const workspace = await this.getWorkspaceContext(userId, false);
    const existing = await this.findManageableCategory(userId, workspace.coupleId, id);

    if (!existing) {
      throw new BadRequestException("Category not found");
    }

    const updated = await this.prisma.client.goodsCategory.update({
      where: { id },
      data: {
        isVisible: dto.isVisible
      }
    });

    return {
      id: updated.id,
      scope: updated.scope,
      name: updated.name,
      sortOrder: updated.sortOrder,
      isVisible: updated.isVisible,
      isSeeded: updated.isSeeded
    };
  }

  async deleteCategory(userId: string, id: string) {
    const workspace = await this.getWorkspaceContext(userId, false);
    const existing = await this.findManageableCategory(userId, workspace.coupleId, id);

    if (!existing) {
      throw new BadRequestException("Category not found");
    }

    const activeItemCount = await this.prisma.client.goodsItem.count({
      where: {
        categoryId: id,
        isArchived: false
      }
    });

    if (activeItemCount > 0) {
      throw new BadRequestException("This category still has active goods. Hide it instead or move those goods first.");
    }

    await this.prisma.client.goodsCategory.update({
      where: { id },
      data: {
        isArchived: true
      }
    });

    return {
      success: true
    };
  }

  async archiveCategory(userId: string, id: string) {
    return this.deleteCategory(userId, id);
  }

  async listUoms(userId: string) {
    await this.requireUser(userId);
    const items = await this.prisma.client.goodsUom.findMany({
      where: {
        isActive: true
      },
      orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
      select: {
        id: true,
        code: true,
        label: true,
        groupKey: true,
        decimals: true,
        isActive: true
      }
    });

    return {
      items
    };
  }

  async createItem(userId: string, dto: CreateGoodsItemDto) {
    const workspace = await this.getWorkspaceContext(userId, true);
    await this.ensureSeedGoodsCategories(userId, workspace.coupleId, workspace.hasPartnerConnection);
    await this.ensureScopeAllowed(dto.scope, workspace.hasPartnerConnection);

    const name = normalizeGoodsName(dto.name);
    if (!name) {
      throw new BadRequestException("Product name is required");
    }

    const quantity = roundQuantity(dto.quantity);
    if (quantity <= 0) {
      throw new BadRequestException("Quantity must be greater than zero");
    }

    const lowStockThreshold = roundQuantity(dto.lowStockThreshold ?? 0);
    const targetQuantity = roundQuantity(dto.targetQuantity ?? quantity);
    assertThresholds(lowStockThreshold, targetQuantity);

    const expirationDate = parseDateOnly(dto.expirationDate);
    const consumptionConfig = normalizeConsumptionConfig(dto.consumptionRateValue, dto.consumptionRateUnit);
    const now = new Date();

    const item = await this.prisma.client.$transaction(async (tx) => {
      await this.requireAccessiblePlace(userId, workspace.coupleId, dto.placeId, dto.scope, tx);
      await this.requireAccessibleCategory(userId, workspace.coupleId, dto.categoryId, dto.scope, tx);
      await this.requireUom(dto.uomId, tx);

      const created = await tx.goodsItem.create({
        data: {
          coupleId: workspace.coupleId,
          scope: dto.scope,
          ownerUserId: dto.scope === "PERSONAL" ? userId : null,
          placeId: dto.placeId,
          categoryId: dto.categoryId,
          uomId: dto.uomId,
          name,
          normalizedName: normalizeGoodsLookupName(name),
          note: dto.note?.trim() || null,
          quantityBase: serializeQuantity(quantity),
          quantityBaseAsOf: now,
          lowStockThreshold: serializeQuantity(lowStockThreshold),
          targetQuantity: serializeQuantity(targetQuantity),
          consumptionRateValue: consumptionConfig.value == null ? null : serializeQuantity(consumptionConfig.value),
          consumptionRateUnit: consumptionConfig.unit,
          consumptionRatePerHour: consumptionConfig.ratePerHour == null ? null : consumptionConfig.ratePerHour.toFixed(8),
          consumptionStartedAt: consumptionConfig.unit === "PERMANENT" ? null : now,
          expirationDate,
          lastStockEventAt: now,
          lastManualEventAt: now,
          createdById: userId
        }
      });

      await tx.goodsItemEvent.create({
        data: {
          goodsItemId: created.id,
          eventType: "INITIAL",
          quantityDelta: serializeQuantity(quantity),
          quantityAfter: serializeQuantity(quantity),
          occurredAt: now,
          createdById: userId,
          source: "USER",
          reason: "Initial stock entry"
        }
      });

      return created;
    });

    return this.itemDetail(userId, item.id);
  }

  async updateItem(userId: string, id: string, dto: UpdateGoodsItemDto) {
    const workspace = await this.getWorkspaceContext(userId, false);

    await this.prisma.client.$transaction(async (tx) => {
      const existing = await this.getAccessibleItemRow(userId, workspace.coupleId, id, tx);
      const materialized = await this.materializeAutoConsumption(tx, id, userId);
      const scope = existing.scope as GoodsScope;
      const name = dto.name ? normalizeGoodsName(dto.name) : existing.name;
      const lowStockThreshold = roundQuantity(dto.lowStockThreshold ?? quantityToNumber(existing.lowStockThreshold));
      const targetQuantity = roundQuantity(dto.targetQuantity ?? quantityToNumber(existing.targetQuantity));
      assertThresholds(lowStockThreshold, targetQuantity);

      const expirationDate =
        dto.expirationDate === null ? null : dto.expirationDate === undefined ? existing.expirationDate : parseDateOnly(dto.expirationDate);
      const currentValue = existing.consumptionRateValue == null ? null : quantityToNumber(existing.consumptionRateValue);
      const nextConsumption = normalizeConsumptionConfig(
        dto.consumptionRateValue === undefined ? currentValue : dto.consumptionRateValue,
        dto.consumptionRateUnit ?? (existing.consumptionRateUnit as GoodsConsumptionUnit)
      );

      const nextPlaceId = dto.placeId ?? existing.placeId;
      const nextCategoryId = dto.categoryId ?? existing.categoryId;
      const nextUomId = dto.uomId ?? existing.uomId;

      await this.requireAccessiblePlace(userId, workspace.coupleId, nextPlaceId, scope, tx, {
        allowHiddenId: existing.placeId
      });
      await this.requireAccessibleCategory(userId, workspace.coupleId, nextCategoryId, scope, tx, {
        allowHiddenId: existing.categoryId
      });
      await this.requireUom(nextUomId, tx);

      await tx.goodsItem.update({
        where: { id },
        data: {
          placeId: nextPlaceId,
          categoryId: nextCategoryId,
          uomId: nextUomId,
          name,
          normalizedName: normalizeGoodsLookupName(name),
          note: dto.note === undefined ? existing.note : dto.note?.trim() || null,
          lowStockThreshold: serializeQuantity(lowStockThreshold),
          targetQuantity: serializeQuantity(targetQuantity),
          expirationDate,
          consumptionRateValue: nextConsumption.value == null ? null : serializeQuantity(nextConsumption.value),
          consumptionRateUnit: nextConsumption.unit,
          consumptionRatePerHour: nextConsumption.ratePerHour == null ? null : nextConsumption.ratePerHour.toFixed(8),
          consumptionStartedAt: nextConsumption.unit === "PERMANENT" ? null : existing.consumptionStartedAt ?? materialized.asOf,
          quantityBaseAsOf: materialized.asOf,
          lastManualEventAt: materialized.asOf
        }
      });

      await tx.goodsItemEvent.create({
        data: {
          goodsItemId: id,
          eventType: "POLICY_UPDATED",
          quantityDelta: "0.000",
          quantityAfter: serializeQuantity(materialized.quantityBase),
          occurredAt: materialized.asOf,
          createdById: userId,
          source: "USER",
          reason: "Item settings were updated",
          metadata: {
            placeId: nextPlaceId,
            categoryId: nextCategoryId,
            uomId: nextUomId,
            expirationDate: expirationDate ? expirationDate.toISOString() : null
          }
        }
      });
    });

    return this.itemDetail(userId, id);
  }

  async restockItem(userId: string, id: string, dto: GoodsQuantityMutationDto) {
    if (dto.quantity <= 0) {
      throw new BadRequestException("Restock quantity must be greater than zero");
    }

    const workspace = await this.getWorkspaceContext(userId, false);

    await this.prisma.client.$transaction(async (tx) => {
      await this.getAccessibleItemRow(userId, workspace.coupleId, id, tx);
      const materialized = await this.materializeAutoConsumption(tx, id, userId);
      const restockAmount = roundQuantity(dto.quantity);
      const nextQuantity = roundQuantity(materialized.quantityBase + restockAmount);
      const now = new Date();

      await tx.goodsItem.update({
        where: { id },
        data: {
          quantityBase: serializeQuantity(nextQuantity),
          quantityBaseAsOf: now,
          lastStockEventAt: now,
          lastManualEventAt: now
        }
      });

      await tx.goodsItemEvent.create({
        data: {
          goodsItemId: id,
          eventType: "RESTOCK",
          quantityDelta: serializeQuantity(restockAmount),
          quantityAfter: serializeQuantity(nextQuantity),
          occurredAt: now,
          createdById: userId,
          source: "USER",
          reason: dto.reason?.trim() || "Manual restock"
        }
      });
    });

    return this.itemDetail(userId, id);
  }

  async consumeItem(userId: string, id: string, dto: GoodsQuantityMutationDto) {
    if (dto.quantity <= 0) {
      throw new BadRequestException("Consumed quantity must be greater than zero");
    }

    const workspace = await this.getWorkspaceContext(userId, false);

    await this.prisma.client.$transaction(async (tx) => {
      await this.getAccessibleItemRow(userId, workspace.coupleId, id, tx);
      const materialized = await this.materializeAutoConsumption(tx, id, userId);
      const requestedAmount = roundQuantity(dto.quantity);
      const consumedAmount = Math.min(requestedAmount, materialized.quantityBase);
      const nextQuantity = roundQuantity(Math.max(0, materialized.quantityBase - consumedAmount));
      const now = new Date();

      await tx.goodsItem.update({
        where: { id },
        data: {
          quantityBase: serializeQuantity(nextQuantity),
          quantityBaseAsOf: now,
          lastStockEventAt: now,
          lastManualEventAt: now
        }
      });

      await tx.goodsItemEvent.create({
        data: {
          goodsItemId: id,
          eventType: "CONSUME",
          quantityDelta: serializeQuantity(-consumedAmount),
          quantityAfter: serializeQuantity(nextQuantity),
          occurredAt: now,
          createdById: userId,
          source: "USER",
          reason: dto.reason?.trim() || "Manual consumption"
        }
      });
    });

    return this.itemDetail(userId, id);
  }

  async reconcileItem(userId: string, id: string, dto: GoodsReconcileDto) {
    const workspace = await this.getWorkspaceContext(userId, false);

    await this.prisma.client.$transaction(async (tx) => {
      await this.getAccessibleItemRow(userId, workspace.coupleId, id, tx);
      const materialized = await this.materializeAutoConsumption(tx, id, userId);
      const nextQuantity = roundQuantity(dto.quantity);
      const delta = roundQuantity(nextQuantity - materialized.quantityBase);
      const now = new Date();

      await tx.goodsItem.update({
        where: { id },
        data: {
          quantityBase: serializeQuantity(nextQuantity),
          quantityBaseAsOf: now,
          lastStockEventAt: now,
          lastManualEventAt: now
        }
      });

      await tx.goodsItemEvent.create({
        data: {
          goodsItemId: id,
          eventType: "SET_BALANCE",
          quantityDelta: serializeQuantity(delta),
          quantityAfter: serializeQuantity(nextQuantity),
          occurredAt: now,
          createdById: userId,
          source: "USER",
          reason: dto.reason?.trim() || "Manual balance reconciliation"
        }
      });
    });

    return this.itemDetail(userId, id);
  }

  async moveItem(userId: string, id: string, dto: GoodsMoveDto) {
    const workspace = await this.getWorkspaceContext(userId, false);

    await this.prisma.client.$transaction(async (tx) => {
      const existing = await this.getAccessibleItemRow(userId, workspace.coupleId, id, tx);
      const materialized = await this.materializeAutoConsumption(tx, id, userId);
      const scope = existing.scope as GoodsScope;
      await this.requireAccessiblePlace(userId, workspace.coupleId, dto.placeId, scope, tx, {
        allowHiddenId: existing.placeId
      });
      await this.requireAccessibleCategory(userId, workspace.coupleId, dto.categoryId, scope, tx, {
        allowHiddenId: existing.categoryId
      });
      const now = new Date();

      await tx.goodsItem.update({
        where: { id },
        data: {
          placeId: dto.placeId,
          categoryId: dto.categoryId,
          quantityBaseAsOf: now,
          lastManualEventAt: now
        }
      });

      await tx.goodsItemEvent.create({
        data: {
          goodsItemId: id,
          eventType: "MOVED",
          quantityDelta: "0.000",
          quantityAfter: serializeQuantity(materialized.quantityBase),
          occurredAt: now,
          createdById: userId,
          source: "USER",
          reason: dto.reason?.trim() || "Moved to a different place/category",
          metadata: {
            placeId: dto.placeId,
            categoryId: dto.categoryId
          }
        }
      });
    });

    return this.itemDetail(userId, id);
  }

  async archiveItem(userId: string, id: string, dto: GoodsArchiveDto) {
    const workspace = await this.getWorkspaceContext(userId, false);

    await this.prisma.client.$transaction(async (tx) => {
      await this.getAccessibleItemRow(userId, workspace.coupleId, id, tx);
      const materialized = await this.materializeAutoConsumption(tx, id, userId);
      const now = new Date();

      await tx.goodsItem.update({
        where: { id },
        data: {
          isArchived: true,
          quantityBaseAsOf: now,
          lastManualEventAt: now
        }
      });

      await tx.goodsItemEvent.create({
        data: {
          goodsItemId: id,
          eventType: "ARCHIVED",
          quantityDelta: "0.000",
          quantityAfter: serializeQuantity(materialized.quantityBase),
          occurredAt: now,
          createdById: userId,
          source: "USER",
          reason: dto.reason?.trim() || "Item archived"
        }
      });
    });

    return {
      success: true
    };
  }
}
