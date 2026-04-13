import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";
import {
  CreateGoodsCategoryDto,
  CreateGoodsItemDto,
  CreateGoodsPlaceDto,
  GoodsArchiveDto,
  GoodsListQueryDto,
  GoodsMoveDto,
  GoodsQuantityMutationDto,
  GoodsReconcileDto,
  UpdateGoodsCategoryDto,
  UpdateGoodsItemDto,
  UpdateGoodsPlaceDto
} from "./dto/goods.dto";

const goodsTimeZone = "Asia/Tashkent";
const defaultGoodsCategories = ["Vegetables", "Fruits", "Meat", "Dairy", "Drinks", "Snacks", "Other"] as const;

type GoodsScope = "PERSONAL" | "SHARED";
type GoodsConsumptionUnit = "HOUR" | "DAY" | "WEEK" | "PERMANENT";
type GoodsStockStatus = "FULL" | "ENOUGH" | "LOW" | "OUT_OF_STOCK";
type GoodsExpirationStatus = "FRESH" | "EXPIRING_SOON" | "EXPIRED" | "NO_EXPIRATION";

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

@Injectable()
export class GoodsService {
  constructor(private readonly prisma: PrismaService) {}

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
    const existingCount = await tx.goodsCategory.count({
      where: {
        coupleId,
        scope,
        ownerUserId: scope === "PERSONAL" ? userId : null,
        isArchived: false
      }
    });

    if (existingCount > 0) {
      return;
    }

    await tx.goodsCategory.createMany({
      data: defaultGoodsCategories.map((name, index) => ({
        coupleId,
        scope,
        ownerUserId: scope === "PERSONAL" ? userId : null,
        name,
        normalizedName: normalizeGoodsLookupName(name),
        sortOrder: (index + 1) * 10,
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
            scope: row.place.scope
          }
        : null,
      category: row.category
        ? {
            id: row.category.id,
            name: row.category.name,
            scope: row.category.scope
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
          sortOrder: true
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
            scope: true
          }
        },
        category: {
          select: {
            id: true,
            name: true,
            scope: true
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

  private async requireAccessiblePlace(userId: string, coupleId: string, placeId: string, scope: GoodsScope, tx: any = this.prisma.client) {
    const place = await tx.goodsPlace.findFirst({
      where: {
        id: placeId,
        coupleId,
        scope,
        isArchived: false,
        ...(scope === "PERSONAL" ? { ownerUserId: userId } : {})
      },
      select: {
        id: true
      }
    });

    if (!place) {
      throw new BadRequestException("Selected place is not available");
    }

    return place;
  }

  private async requireAccessibleCategory(userId: string, coupleId: string, categoryId: string, scope: GoodsScope, tx: any = this.prisma.client) {
    const category = await tx.goodsCategory.findFirst({
      where: {
        id: categoryId,
        coupleId,
        scope,
        isArchived: false,
        ...(scope === "PERSONAL" ? { ownerUserId: userId } : {})
      },
      select: {
        id: true
      }
    });

    if (!category) {
      throw new BadRequestException("Selected category is not available");
    }

    return category;
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
        place: { select: { id: true, name: true, scope: true } },
        category: { select: { id: true, name: true, scope: true } },
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
        place: { select: { id: true, name: true, scope: true } },
        category: { select: { id: true, name: true, scope: true } },
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
        _count: {
          select: {
            items: true
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
      sortOrder: place.sortOrder
    };
  }

  async updatePlace(userId: string, id: string, dto: UpdateGoodsPlaceDto) {
    const workspace = await this.getWorkspaceContext(userId, false);
    const existing = await this.prisma.client.goodsPlace.findFirst({
      where: {
        id,
        coupleId: workspace.coupleId,
        isArchived: false,
        ...this.buildScopeAccessWhere(userId)
      }
    });

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
      sortOrder: updated.sortOrder
    };
  }

  async archivePlace(userId: string, id: string) {
    const workspace = await this.getWorkspaceContext(userId, false);
    const existing = await this.prisma.client.goodsPlace.findFirst({
      where: {
        id,
        coupleId: workspace.coupleId,
        isArchived: false,
        ...this.buildScopeAccessWhere(userId)
      }
    });

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
      throw new BadRequestException("Archive or move active goods before archiving this place");
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
        isSeeded: true,
        _count: {
          select: {
            items: true
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
      sortOrder: category.sortOrder
    };
  }

  async updateCategory(userId: string, id: string, dto: UpdateGoodsCategoryDto) {
    const workspace = await this.getWorkspaceContext(userId, false);
    const existing = await this.prisma.client.goodsCategory.findFirst({
      where: {
        id,
        coupleId: workspace.coupleId,
        isArchived: false,
        ...this.buildScopeAccessWhere(userId)
      }
    });

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
      sortOrder: updated.sortOrder
    };
  }

  async archiveCategory(userId: string, id: string) {
    const workspace = await this.getWorkspaceContext(userId, false);
    const existing = await this.prisma.client.goodsCategory.findFirst({
      where: {
        id,
        coupleId: workspace.coupleId,
        isArchived: false,
        ...this.buildScopeAccessWhere(userId)
      }
    });

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
      throw new BadRequestException("Archive or move active goods before archiving this category");
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

      await this.requireAccessiblePlace(userId, workspace.coupleId, nextPlaceId, scope, tx);
      await this.requireAccessibleCategory(userId, workspace.coupleId, nextCategoryId, scope, tx);
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
      await this.requireAccessiblePlace(userId, workspace.coupleId, dto.placeId, scope, tx);
      await this.requireAccessibleCategory(userId, workspace.coupleId, dto.categoryId, scope, tx);
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
