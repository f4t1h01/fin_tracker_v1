import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";

import { convertFromUzs, convertToUzs, getLatestCurrencyRates, normalizeCurrency, SUPPORTED_CURRENCIES } from "../common/currency";
import { generateCoupleCodeCandidate, normalizeCoupleCode } from "../common/couple-code";
import { PrismaService } from "../prisma/prisma.service";
import { BindCoupleDto } from "./dto/bind-couple.dto";
import { CreateCategoryDto, UpdateCategoryPreferencesDto, UpdateCategoryVisibilityDto } from "./dto/category-management.dto";
import { CreateProfileTransactionDto } from "./dto/create-profile-transaction.dto";
import { DashboardQueryDto, type DashboardRangePreset, type DashboardViewMode } from "./dto/dashboard-query.dto";
import { type UpdateAnalyticsPreferencesDto, type WeekStartDay, weekStartDays } from "./dto/update-analytics-preferences.dto";
import { UpdateProfileDetailsDto } from "./dto/update-profile-details.dto";
import { UpdateProfileTransactionDto } from "./dto/update-profile-transaction.dto";

type SummaryRange = {
  start: Date;
  endExclusive: Date;
  month: number;
  year: number;
};

type DashboardDateRange = SummaryRange & {
  preset: DashboardRangePreset;
  from: string | null;
  to: string | null;
  label: string;
};

const defaultWeekStartsOn: WeekStartDay = "MONDAY";
const dashboardViewModes = ["COUPLE", "PERSONAL"] as const;
const categoryScopes = ["PERSONAL", "SHARED"] as const;
const dashboardTrendGranularities = ["DAY", "WEEK", "MONTH"] as const;
const dashboardTimeZone = "Asia/Tashkent";

type CategoryScope = (typeof categoryScopes)[number];
type TransactionKind = "EXPENSE" | "INCOME";
type DashboardTrendGranularity = (typeof dashboardTrendGranularities)[number];

type CategoryTreeNode = {
  id: string;
  name: string;
  scope: CategoryScope;
  kind: TransactionKind;
  ownerUserId: string | null;
  isVisible: boolean;
  children: Array<{
    id: string;
    name: string;
    scope: CategoryScope;
    kind: TransactionKind;
    ownerUserId: string | null;
    isVisible: boolean;
  }>;
};

type CategoryCatalog = {
  preferences: {
    showSharedCategories: boolean;
    defaultIncomeCategoryId: string | null;
    defaultExpenseCategoryId: string | null;
  };
  byKind: Record<TransactionKind, { personal: CategoryTreeNode[]; shared: CategoryTreeNode[] }>;
};

type DashboardRangeResolution = SummaryRange & {
  preset: DashboardRangePreset;
  from: string | null;
  to: string | null;
  monthKey: string | null;
  label: string;
};

type DashboardTransactionRow = {
  id: string;
  kind: TransactionKind;
  amount: { toNumber: () => number } | number | string;
  amountInUzs: { toNumber: () => number } | number | string;
  currency: string;
  note: string | null;
  happenedAt: Date;
  category: {
    id: string;
    name: string;
    kind: TransactionKind;
  };
  user: {
    firstName: string | null;
    username: string | null;
  };
  userId: string;
};

type DashboardTrendItem = {
  label: string;
  start: string;
  end: string;
  income: number;
  expense: number;
  net: number;
};

type DashboardBreakdownItem = {
  categoryId: string;
  categoryName: string;
  kind: TransactionKind;
  totalAmountInUzs: number;
  share: number;
};

type DashboardCharts = {
  trend: {
    granularity: DashboardTrendGranularity;
    items: DashboardTrendItem[];
  };
  breakdown: {
    items: DashboardBreakdownItem[];
  };
};

type DashboardTransactionsSlice = {
  items: DashboardTransactionRow[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

function isWeekStartDay(value: string | null | undefined): value is WeekStartDay {
  return Boolean(value && weekStartDays.includes(value as WeekStartDay));
}

function startOfUtcDay(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

function addUtcDays(value: Date, amount: number) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate() + amount));
}

function formatUtcDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function parseDateOnly(value: string) {
  const [yearText, monthText, dayText] = value.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) {
    throw new BadRequestException("Date filter is invalid");
  }

  return parsed;
}

function parseMonthKey(value: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) {
    throw new BadRequestException("monthKey must use YYYY-MM format");
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const start = new Date(Date.UTC(year, month - 1, 1));
  if (start.getUTCFullYear() !== year || start.getUTCMonth() !== month - 1) {
    throw new BadRequestException("monthKey is invalid");
  }

  return {
    year,
    month,
    start,
    endExclusive: new Date(Date.UTC(year, month, 1))
  };
}

function formatMonthKey(value: Date) {
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLabel(value: Date) {
  return value.toLocaleString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC"
  });
}

function parseTimeToMinutes(value?: string | null) {
  if (!value) {
    return null;
  }

  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) {
    throw new BadRequestException("Time filters must use HH:mm format");
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours > 23 || minutes > 59) {
    throw new BadRequestException("Time filters are invalid");
  }

  return hours * 60 + minutes;
}

function getTashkentMinutes(value: Date) {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: dashboardTimeZone
  });

  const parts = formatter.formatToParts(value);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  return hour * 60 + minute;
}

function matchesTimeWindow(value: Date, fromMinutes: number | null, toMinutes: number | null) {
  if (fromMinutes === null && toMinutes === null) {
    return true;
  }

  const current = getTashkentMinutes(value);

  if (fromMinutes !== null && toMinutes !== null) {
    return fromMinutes <= toMinutes ? current >= fromMinutes && current <= toMinutes : current >= fromMinutes || current <= toMinutes;
  }

  if (fromMinutes !== null) {
    return current >= fromMinutes;
  }

  return current <= (toMinutes ?? 0);
}

function getGranularity(start: Date, endExclusive: Date): DashboardTrendGranularity {
  const spanDays = Math.max(1, Math.round((endExclusive.getTime() - start.getTime()) / 86400000));
  if (spanDays <= 31) {
    return "DAY";
  }

  return spanDays <= 90 ? "WEEK" : "MONTH";
}

function getBucketStart(date: Date, granularity: DashboardTrendGranularity, rangeStart: Date) {
  if (granularity === "DAY") {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  }

  if (granularity === "MONTH") {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  }

  const dayOffset = Math.floor((date.getTime() - rangeStart.getTime()) / 86400000);
  const bucketStart = addUtcDays(rangeStart, Math.floor(dayOffset / 7) * 7);
  return new Date(Date.UTC(bucketStart.getUTCFullYear(), bucketStart.getUTCMonth(), bucketStart.getUTCDate()));
}

function getBucketEnd(start: Date, granularity: DashboardTrendGranularity) {
  if (granularity === "DAY") {
    return addUtcDays(start, 1);
  }

  if (granularity === "MONTH") {
    return new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
  }

  return addUtcDays(start, 7);
}

function resolveWeekStartOffset(dayOfWeek: number, weekStartsOn: WeekStartDay) {
  const startIndex = weekStartDays.indexOf(weekStartsOn);
  const normalizedDay = (dayOfWeek + 6) % 7;
  return (normalizedDay - startIndex + 7) % 7;
}

function normalizeCategoryName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeCategoryLookupName(value: string) {
  return normalizeCategoryName(value).toLowerCase();
}

function decimalToNumber(value: { toNumber: () => number } | number | string) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    return Number(value);
  }

  return value.toNumber();
}

@Injectable()
export class ProfileService {
  private userColumnExistsCache = new Map<string, boolean>();

  constructor(private readonly prisma: PrismaService) {}

  private async hasUserColumn(columnName: string) {
    if (this.userColumnExistsCache.has(columnName)) {
      return this.userColumnExistsCache.get(columnName) ?? false;
    }

    const result = await this.prisma.client.$queryRawUnsafe<Array<{ exists: boolean }>>(
      `SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'User' AND column_name = '${columnName}'
      ) AS "exists"`
    );

    const exists = Boolean(result[0]?.exists);
    this.userColumnExistsCache.set(columnName, exists);
    return exists;
  }

  private hasBirthdayColumn() {
    return this.hasUserColumn("birthday");
  }

  private hasWeekStartsOnColumn() {
    return this.hasUserColumn("week_starts_on");
  }

  private async getWeekStartsOnPreference(userId: string) {
    const hasWeekStartsOnColumn = await this.hasWeekStartsOnColumn();
    if (!hasWeekStartsOnColumn) {
      return defaultWeekStartsOn;
    }

    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      select: { id: true, weekStartsOn: true }
    });

    if (!user) {
      throw new UnauthorizedException("Invalid token");
    }

    return isWeekStartDay(user.weekStartsOn) ? user.weekStartsOn : defaultWeekStartsOn;
  }

  private resolveMonthRange(month?: number, year?: number): SummaryRange {
    const now = new Date();
    const normalizedMonth = month ?? now.getMonth() + 1;
    const normalizedYear = year ?? now.getFullYear();

    if (!Number.isInteger(normalizedMonth) || normalizedMonth < 1 || normalizedMonth > 12) {
      throw new BadRequestException("month must be between 1 and 12");
    }

    if (!Number.isInteger(normalizedYear) || normalizedYear < 2000 || normalizedYear > 2200) {
      throw new BadRequestException("year is out of accepted range");
    }

    return {
      start: new Date(Date.UTC(normalizedYear, normalizedMonth - 1, 1)),
      endExclusive: new Date(Date.UTC(normalizedYear, normalizedMonth, 1)),
      month: normalizedMonth,
      year: normalizedYear
    };
  }

  private resolveDashboardRange(query: DashboardQueryDto | undefined, weekStartsOn: WeekStartDay): DashboardRangeResolution {
    const preset = query?.rangePreset ?? "THIS_WEEK";
    const today = startOfUtcDay(new Date());
    const tomorrow = addUtcDays(today, 1);

    if (preset === "THIS_MONTH") {
      return {
        preset,
        start: new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)),
        endExclusive: tomorrow,
        month: today.getUTCMonth() + 1,
        year: today.getUTCFullYear(),
        from: null,
        to: null,
        monthKey: formatMonthKey(today),
        label: "This month"
      };
    }

    if (preset === "SPECIFIC_MONTH") {
      if (!query?.monthKey) {
        throw new BadRequestException("Specific month requires monthKey");
      }

      const resolved = parseMonthKey(query.monthKey);
      return {
        preset,
        start: resolved.start,
        endExclusive: resolved.endExclusive,
        month: resolved.month,
        year: resolved.year,
        from: null,
        to: null,
        monthKey: query.monthKey,
        label: formatMonthLabel(resolved.start)
      };
    }

    if (preset === "CUSTOM") {
      if (!query?.from || !query?.to) {
        throw new BadRequestException("Custom range requires both from and to dates");
      }

      const start = parseDateOnly(query.from);
      const inclusiveEnd = parseDateOnly(query.to);

      if (inclusiveEnd < start) {
        throw new BadRequestException("Custom range end date cannot be earlier than the start date");
      }

      return {
        preset,
        start,
        endExclusive: addUtcDays(inclusiveEnd, 1),
        month: start.getUTCMonth() + 1,
        year: start.getUTCFullYear(),
        from: query.from,
        to: query.to,
        monthKey: null,
        label: "Custom range"
      };
    }

    const offset = resolveWeekStartOffset(today.getUTCDay(), weekStartsOn);
    const start = addUtcDays(today, -offset);

    return {
      preset: "THIS_WEEK",
      start,
      endExclusive: tomorrow,
      month: today.getUTCMonth() + 1,
      year: today.getUTCFullYear(),
      from: null,
      to: null,
      monthKey: formatMonthKey(today),
      label: "This week"
    };
  }

  private async getPartnerUserId(userId: string, coupleId: string | null) {
    if (!coupleId) {
      return null;
    }

    const partner = await this.prisma.client.membership.findFirst({
      where: {
        coupleId,
        NOT: {
          userId
        }
      },
      select: {
        userId: true
      }
    });

    return partner?.userId ?? null;
  }

  private buildDashboardTransactionWhere(params: {
    userId: string;
    coupleId: string | null;
    viewMode: DashboardViewMode;
    query?: DashboardQueryDto;
    partnerUserId: string | null;
    range: DashboardRangeResolution;
  }): any {
    const search = params.query?.search?.trim() ?? "";
    const normalizedSearch = search.toLowerCase();
    const categoryId = params.query?.categoryId?.trim();
    const kind = params.query?.kind;
    const actor = params.query?.actor ?? "EVERYONE";

    const baseWhere: any = {
      happenedAt: {
        gte: params.range.start,
        lt: params.range.endExclusive
      }
    };

    if (params.viewMode === "PERSONAL") {
      baseWhere.userId = params.userId;
    } else if (params.coupleId) {
      baseWhere.coupleId = params.coupleId;
    }

    if (kind && kind !== "ALL") {
      baseWhere.kind = kind;
    }

    if (categoryId) {
      baseWhere.categoryId = categoryId;
    }

    if (actor === "ME") {
      baseWhere.userId = params.userId;
    } else if (actor === "PARTNER" && params.partnerUserId) {
      baseWhere.userId = params.partnerUserId;
    } else if (actor === "PARTNER") {
      baseWhere.userId = "___NO_PARTNER___";
    }

    if (normalizedSearch) {
      baseWhere.OR = [
        { note: { contains: search, mode: "insensitive" } },
        { category: { is: { name: { contains: search, mode: "insensitive" } } } },
        { category: { is: { normalizedName: { contains: normalizedSearch } } } }
      ];
    }

    return baseWhere;
  }

  private getDashboardFilteredTransactions(rows: DashboardTransactionRow[], query?: DashboardQueryDto) {
    const fromMinutes = parseTimeToMinutes(query?.timeFrom);
    const toMinutes = parseTimeToMinutes(query?.timeTo);
    return rows.filter((row) => matchesTimeWindow(row.happenedAt, fromMinutes, toMinutes));
  }

  private buildDashboardTransactionsSlice(rows: DashboardTransactionRow[], page: number, pageSize: number): DashboardTransactionsSlice {
    const totalItems = rows.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const normalizedPage = Math.min(Math.max(1, page), totalPages);
    const startIndex = (normalizedPage - 1) * pageSize;

    return {
      items: rows.slice(startIndex, startIndex + pageSize),
      page: normalizedPage,
      pageSize,
      totalItems,
      totalPages
    };
  }

  private buildDashboardCharts(rows: DashboardTransactionRow[], range: DashboardRangeResolution): DashboardCharts {
    const granularity = getGranularity(range.start, range.endExclusive);
    const buckets = new Map<string, DashboardTrendItem>();

    let cursor = new Date(range.start.getTime());
    while (cursor < range.endExclusive) {
      const bucketStart = getBucketStart(cursor, granularity, range.start);
      const bucketEnd = getBucketEnd(bucketStart, granularity);
      const key = bucketStart.toISOString();
      if (!buckets.has(key)) {
        buckets.set(key, {
          label:
            granularity === "MONTH"
              ? formatMonthLabel(bucketStart)
              : granularity === "WEEK"
                ? `${formatUtcDate(bucketStart)} - ${formatUtcDate(addUtcDays(bucketEnd, -1))}`
                : formatUtcDate(bucketStart),
          start: bucketStart.toISOString(),
          end: bucketEnd.toISOString(),
          income: 0,
          expense: 0,
          net: 0
        });
      }

      cursor = bucketEnd;
    }

    for (const row of rows) {
      const amount = decimalToNumber(row.amountInUzs);
      const bucketStart = getBucketStart(row.happenedAt, granularity, range.start);
      const key = bucketStart.toISOString();
      const bucket = buckets.get(key);
      if (!bucket) {
        continue;
      }

      if (row.kind === "INCOME") {
        bucket.income += amount;
      } else {
        bucket.expense += amount;
      }
    }

    const trendItems = Array.from(buckets.values())
      .sort((a, b) => a.start.localeCompare(b.start))
      .map((bucket) => ({
        ...bucket,
        income: Number(bucket.income.toFixed(2)),
        expense: Number(bucket.expense.toFixed(2)),
        net: Number((bucket.income - bucket.expense).toFixed(2))
      }));

    const breakdownBuckets = new Map<string, { categoryId: string; categoryName: string; kind: TransactionKind; totalAmountInUzs: number }>();
    let totalAmountInUzs = 0;
    for (const row of rows) {
      const amount = decimalToNumber(row.amountInUzs);
      totalAmountInUzs += amount;
      const existing = breakdownBuckets.get(row.category.id);
      if (existing) {
        existing.totalAmountInUzs += amount;
      } else {
        breakdownBuckets.set(row.category.id, {
          categoryId: row.category.id,
          categoryName: row.category.name,
          kind: row.kind,
          totalAmountInUzs: amount
        });
      }
    }

    const breakdownItems = Array.from(breakdownBuckets.values())
      .sort((a, b) => b.totalAmountInUzs - a.totalAmountInUzs)
      .map((item) => ({
        ...item,
        totalAmountInUzs: Number(item.totalAmountInUzs.toFixed(2)),
        share: totalAmountInUzs > 0 ? Number(((item.totalAmountInUzs / totalAmountInUzs) * 100).toFixed(2)) : 0
      }));

    return {
      trend: {
        granularity,
        items: trendItems
      },
      breakdown: {
        items: breakdownItems
      }
    };
  }

  private summarizeDashboardTransactions(rows: DashboardTransactionRow[], userId: string, range: DashboardRangeResolution) {
    let totalIncome = 0;
    let totalExpense = 0;
    let personalIncome = 0;
    let personalExpense = 0;

    for (const row of rows) {
      const amount = decimalToNumber(row.amountInUzs);
      if (row.kind === "INCOME") {
        totalIncome += amount;
        if (row.userId === userId) {
          personalIncome += amount;
        }
      } else {
        totalExpense += amount;
        if (row.userId === userId) {
          personalExpense += amount;
        }
      }
    }

    return {
      month: range.month,
      year: range.year,
      currency: "UZS" as const,
      totalIncome: Number(totalIncome.toFixed(2)),
      totalExpense: Number(totalExpense.toFixed(2)),
      balance: Number((totalIncome - totalExpense).toFixed(2)),
      personalIncome: Number(personalIncome.toFixed(2)),
      personalExpense: Number(personalExpense.toFixed(2)),
      personalBalance: Number((personalIncome - personalExpense).toFixed(2))
    };
  }

  private async getAuthState(userId: string) {
    const [hasBirthdayColumn, hasWeekStartsOnColumn] = await Promise.all([this.hasBirthdayColumn(), this.hasWeekStartsOnColumn()]);
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        telegramId: true,
        lastTelegramChatId: true,
        email: true,
        passwordSetAt: true,
        passwordHash: true,
        coupleCode: true,
        username: true,
        firstName: true,
        lastName: true,
        ...(hasBirthdayColumn ? { birthday: true } : {}),
        photoUrl: true,
        telegramPhone: true,
        isAdmin: true,
        isDark: true,
        showSharedCategories: true,
        ...(hasWeekStartsOnColumn ? { weekStartsOn: true } : {})
      }
    });

    if (!user) {
      throw new UnauthorizedException("Invalid token");
    }

    return {
      id: user.id,
      telegramId: user.telegramId.toString(),
      lastTelegramChatId: user.lastTelegramChatId ? user.lastTelegramChatId.toString() : null,
      email: user.email,
      passwordSetAt: user.passwordSetAt,
      hasPassword: Boolean(user.passwordHash),
      coupleCode: user.coupleCode,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      birthday: hasBirthdayColumn ? ((user as { birthday?: Date | null }).birthday ?? null) : null,
      photoUrl: user.photoUrl,
      telegramPhone: user.telegramPhone,
      isAdmin: user.isAdmin,
      isDark: user.isDark,
      showSharedCategories: user.showSharedCategories,
      weekStartsOn: hasWeekStartsOnColumn && isWeekStartDay((user as { weekStartsOn?: string | null }).weekStartsOn) ? (user as { weekStartsOn?: WeekStartDay }).weekStartsOn ?? defaultWeekStartsOn : defaultWeekStartsOn
    };
  }

  private async ensureUserCoupleCode(userId: string): Promise<string> {
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const existing = await this.prisma.client.user.findUnique({
        where: { id: userId },
        select: { coupleCode: true }
      });

      if (!existing) {
        throw new NotFoundException("User not found");
      }

      if (existing.coupleCode) {
        return existing.coupleCode;
      }

      const candidateCode = generateCoupleCodeCandidate();

      try {
        const updated = await this.prisma.client.user.updateMany({
          where: {
            id: userId,
            coupleCode: null
          },
          data: {
            coupleCode: candidateCode
          }
        });

        if (updated.count === 1) {
          return candidateCode;
        }
      } catch {
        continue;
      }
    }

    throw new BadRequestException("Could not reserve a unique couple code");
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

  private async resolveActiveCoupleId(userId: string, createIfMissing: boolean): Promise<string | null> {
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
      select: { id: true }
    });

    if (!membership) {
      throw new BadRequestException("User is not linked to this couple workspace");
    }
  }

  private async getCategoryPreferences(userId: string) {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      select: {
        showSharedCategories: true,
        defaultIncomeCategoryId: true,
        defaultExpenseCategoryId: true
      }
    });

    if (!user) {
      throw new UnauthorizedException("Invalid token");
    }

    return {
      showSharedCategories: user.showSharedCategories,
      defaultIncomeCategoryId: user.defaultIncomeCategoryId,
      defaultExpenseCategoryId: user.defaultExpenseCategoryId
    };
  }

  private async getCategoryCatalog(userId: string): Promise<CategoryCatalog> {
    const coupleId = await this.resolveActiveCoupleId(userId, true);
    if (!coupleId) {
      return {
        preferences: {
          showSharedCategories: true,
          defaultIncomeCategoryId: null,
          defaultExpenseCategoryId: null
        },
        byKind: {
          EXPENSE: { personal: [], shared: [] },
          INCOME: { personal: [], shared: [] }
        }
      };
    }

    await this.assertMembership(userId, coupleId);

    const [preferences, rows] = await Promise.all([
      this.getCategoryPreferences(userId),
      this.prisma.client.category.findMany({
        where: {
          coupleId,
          OR: [{ scope: "SHARED" }, { scope: "PERSONAL", ownerUserId: userId }]
        },
        orderBy: [{ scope: "asc" }, { kind: "asc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          kind: true,
          scope: true,
          ownerUserId: true,
          isVisible: true,
          parentCategoryId: true
        }
      })
    ]);

    const byKind: CategoryCatalog["byKind"] = {
      EXPENSE: { personal: [], shared: [] },
      INCOME: { personal: [], shared: [] }
    };

    const childMap = new Map<string, CategoryTreeNode["children"]>();
    for (const row of rows) {
      if (!row.parentCategoryId) {
        childMap.set(row.id, []);
      }
    }

    for (const row of rows) {
      if (!row.parentCategoryId) {
        continue;
      }

      const collection = childMap.get(row.parentCategoryId);
      if (!collection) {
        continue;
      }

      collection.push({
        id: row.id,
        name: row.name,
        scope: row.scope as CategoryScope,
        kind: row.kind as TransactionKind,
        ownerUserId: row.ownerUserId,
        isVisible: row.isVisible
      });
    }

    for (const row of rows) {
      if (row.parentCategoryId) {
        continue;
      }

      const target = row.scope === "SHARED" ? byKind[row.kind as TransactionKind].shared : byKind[row.kind as TransactionKind].personal;
      target.push({
        id: row.id,
        name: row.name,
        scope: row.scope as CategoryScope,
        kind: row.kind as TransactionKind,
        ownerUserId: row.ownerUserId,
        isVisible: row.isVisible,
        children: childMap.get(row.id) ?? []
      });
    }

    return {
      preferences,
      byKind
    };
  }

  private async hasActivePartnerBind(userId: string) {
    const bind = await this.prisma.client.coupleBind.findUnique({
      where: { userId },
      select: { coupleId: true }
    });

    return Boolean(bind?.coupleId);
  }

  private async resolveSelectedCategory(userId: string, coupleId: string, kind: TransactionKind, categoryId: string) {
    const category = await this.prisma.client.category.findUnique({
      where: { id: categoryId },
      select: {
        id: true,
        coupleId: true,
        kind: true,
        scope: true,
        ownerUserId: true,
        parentCategoryId: true,
        name: true
      }
    });

    if (!category || category.coupleId !== coupleId) {
      throw new BadRequestException("Selected category was not found in this workspace");
    }

    if (category.kind !== kind) {
      throw new BadRequestException("Selected category does not match the transaction type");
    }

    if (category.scope === "PERSONAL" && category.ownerUserId !== userId) {
      throw new BadRequestException("Selected category is not available to this user");
    }

    return category;
  }

  private async findMatchingCategory(params: {
    coupleId: string;
    userId: string;
    kind: TransactionKind;
    scope: CategoryScope;
    parentCategoryId?: string | null;
    name: string;
  }) {
    const normalizedName = normalizeCategoryLookupName(params.name);

    return this.prisma.client.category.findFirst({
      where: {
        coupleId: params.coupleId,
        kind: params.kind,
        scope: params.scope,
        isVisible: true,
        ownerUserId: params.scope === "PERSONAL" ? params.userId : null,
        parentCategoryId: params.parentCategoryId ?? null,
        normalizedName
      },
      select: {
        id: true
      }
    });
  }

  private async createManagedCategory(params: {
    coupleId: string;
    userId: string;
    kind: TransactionKind;
    scope: CategoryScope;
    name: string;
    parentCategoryId?: string | null;
  }) {
    const normalizedName = normalizeCategoryLookupName(params.name);
    const trimmedName = normalizeCategoryName(params.name);

    if (params.parentCategoryId) {
      const parent = await this.prisma.client.category.findUnique({
        where: { id: params.parentCategoryId },
        select: {
          id: true,
          coupleId: true,
          kind: true,
          scope: true,
          ownerUserId: true,
          parentCategoryId: true
        }
      });

      if (!parent || parent.coupleId !== params.coupleId) {
        throw new BadRequestException("Parent category was not found in this workspace");
      }

      if (parent.parentCategoryId) {
        throw new BadRequestException("Only one level of subcategory nesting is supported");
      }

      if (parent.kind !== params.kind) {
        throw new BadRequestException("Subcategory type must match the parent category");
      }

      if (parent.scope !== params.scope) {
        throw new BadRequestException("Subcategory scope must match the parent category");
      }

      if (params.scope === "PERSONAL" && parent.ownerUserId !== params.userId) {
        throw new BadRequestException("Personal subcategories must stay under the same owner");
      }
    }

    const existing = await this.findMatchingCategory({
      coupleId: params.coupleId,
      userId: params.userId,
      kind: params.kind,
      scope: params.scope,
      parentCategoryId: params.parentCategoryId ?? null,
      name: trimmedName
    });

    if (existing) {
      return existing;
    }

    return this.prisma.client.category.create({
      data: {
        coupleId: params.coupleId,
        kind: params.kind,
        scope: params.scope,
        ownerUserId: params.scope === "PERSONAL" ? params.userId : null,
        parentCategoryId: params.parentCategoryId ?? null,
        name: trimmedName,
        normalizedName,
        createdById: params.userId
      },
      select: {
        id: true
      }
    });
  }

  async getProfile(userId: string) {
    const hasBirthdayColumn = await this.hasBirthdayColumn();
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        telegramId: true,
        firstName: true,
        lastName: true,
        username: true,
        ...(hasBirthdayColumn ? { birthday: true } : {}),
        coupleCode: true,
        coupleBind: {
          select: {
            insertedCode: true,
            userCoupleCode: true,
            coupleId: true,
            updatedAt: true
          }
        }
      }
    });

    if (!user) {
      throw new UnauthorizedException("Invalid token");
    }

    const coupleCode = user.coupleCode ?? (await this.ensureUserCoupleCode(userId));
    const activeCoupleId = await this.resolveActiveCoupleId(userId, false);

    if (!activeCoupleId) {
      return {
        user: {
          id: user.id,
          telegramId: user.telegramId.toString(),
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          birthday: hasBirthdayColumn ? ((user as { birthday?: Date | null }).birthday ?? null) : null,
          coupleCode
        },
        activeCouple: null,
        bind: user.coupleBind,
        hasPartnerConnection: Boolean(user.coupleBind)
      };
    }

    const activeCouple = await this.prisma.client.couple.findUnique({
      where: { id: activeCoupleId },
      select: {
        id: true,
        name: true,
        memberships: {
          where: { userId },
          select: { role: true },
          take: 1
        }
      }
    });

    return {
      user: {
        id: user.id,
        telegramId: user.telegramId.toString(),
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        birthday: hasBirthdayColumn ? ((user as { birthday?: Date | null }).birthday ?? null) : null,
        coupleCode
      },
      activeCouple: activeCouple
        ? {
            id: activeCouple.id,
            name: activeCouple.name,
            role: activeCouple.memberships[0]?.role ?? "PARTNER"
          }
        : null,
      bind: user.coupleBind,
      hasPartnerConnection: Boolean(user.coupleBind)
    };
  }

  async updateDetails(userId: string, dto: UpdateProfileDetailsDto) {
    const hasBirthdayColumn = await this.hasBirthdayColumn();

    if (!hasBirthdayColumn && dto.birthday !== undefined) {
      throw new BadRequestException("Birthday is not available yet on this deployment. Run the latest database migration first.");
    }

    const existing = await this.prisma.client.user.findUnique({
      where: { id: userId },
      select: { id: true }
    });

    if (!existing) {
      throw new UnauthorizedException("Invalid token");
    }

    return this.prisma.client.user.update({
      where: { id: userId },
      data: {
        firstName: dto.firstName?.trim() || null,
        lastName: dto.lastName?.trim() || null,
        ...(hasBirthdayColumn
          ? {
              birthday:
                dto.birthday === undefined ? undefined : dto.birthday ? new Date(`${dto.birthday}T00:00:00.000Z`) : null
            }
          : {})
      },
      select: {
        id: true,
        telegramId: true,
        firstName: true,
        lastName: true,
        username: true,
        ...(hasBirthdayColumn ? { birthday: true } : {}),
        coupleCode: true,
        lastTelegramChatId: true,
        email: true,
        isDark: true
      }
    });
  }

  async updateAnalyticsPreferences(userId: string, dto: UpdateAnalyticsPreferencesDto) {
    const hasWeekStartsOnColumn = await this.hasWeekStartsOnColumn();

    if (!hasWeekStartsOnColumn) {
      throw new BadRequestException("Analytics preferences are not available yet on this deployment. Run the latest database migration first.");
    }

    const existing = await this.prisma.client.user.findUnique({
      where: { id: userId },
      select: { id: true }
    });

    if (!existing) {
      throw new UnauthorizedException("Invalid token");
    }

    const updated = await this.prisma.client.user.update({
      where: { id: userId },
      data: {
        weekStartsOn: dto.weekStartsOn
      },
      select: {
        weekStartsOn: true
      }
    });

    return {
      weekStartsOn: isWeekStartDay(updated.weekStartsOn) ? updated.weekStartsOn : defaultWeekStartsOn
    };
  }

  async snapshot(userId: string, month?: number, year?: number) {
    const [profile, summary, recent, auth, categories] = await Promise.all([
      this.getProfile(userId),
      this.summary(userId, month, year),
      this.recentTransactions(userId),
      this.getAuthState(userId),
      this.getCategoryCatalog(userId)
    ]);

    return {
      profile,
      summary,
      recent,
      auth,
      categories
    };
  }

  async dashboard(userId: string, query?: DashboardQueryDto) {
    const weekStartsOn = await this.getWeekStartsOnPreference(userId);
    const range = this.resolveDashboardRange(query, weekStartsOn);
    const viewMode = query?.viewMode ?? "COUPLE";
    const coupleId = await this.resolveActiveCoupleId(userId, false);
    const partnerUserId = viewMode === "COUPLE" ? await this.getPartnerUserId(userId, coupleId) : null;
    const categoryCatalog = await this.getCategoryCatalog(userId);
    const [profile, rates, rows] = await Promise.all([
      this.getProfile(userId),
      getLatestCurrencyRates(),
      this.prisma.client.transaction.findMany({
        where: this.buildDashboardTransactionWhere({
          userId,
          coupleId,
          viewMode,
          query,
          partnerUserId,
          range
        }),
        include: {
          category: {
            select: {
              id: true,
              name: true,
              kind: true
            }
          },
          user: {
            select: {
              firstName: true,
              username: true
            }
          }
        },
        orderBy: {
          happenedAt: "desc"
        }
      })
    ]);

    const filteredRows = this.getDashboardFilteredTransactions(
      rows.map((row) => ({
        ...row,
        amount: row.amount,
        amountInUzs: row.amountInUzs,
        currency: row.currency,
        userId: row.userId
      })),
      query
    );

    const pageSize = query?.pageSize ?? 20;
    const page = query?.page ?? 1;
    const transactionsPage = this.buildDashboardTransactionsSlice(filteredRows, page, pageSize);
    const summary = this.summarizeDashboardTransactions(filteredRows, userId, range);
    const charts = this.buildDashboardCharts(filteredRows, range);

    const mappedTransactions = transactionsPage.items.map((row) => ({
      id: row.id,
      kind: row.kind,
      amount: decimalToNumber(row.amount),
      amountInUzs: decimalToNumber(row.amountInUzs),
      currency: normalizeCurrency(row.currency),
      note: row.note,
      happenedAt: row.happenedAt.toISOString(),
      category: row.category,
      user: row.user
    }));

    return {
      profile,
      summary,
      recent: mappedTransactions,
      transactions: {
        ...transactionsPage,
        items: mappedTransactions
      },
      rates,
      supportedCurrencies: [...SUPPORTED_CURRENCIES],
      filter: {
        preset: range.preset,
        from: range.from,
        to: range.to,
        monthKey: range.monthKey,
        viewMode,
        kind: query?.kind ?? "ALL",
        categoryId: query?.categoryId ?? null,
        actor: query?.actor ?? "EVERYONE",
        search: query?.search?.trim() ?? "",
        timeFrom: query?.timeFrom ?? null,
        timeTo: query?.timeTo ?? null,
        page: transactionsPage.page,
        pageSize: transactionsPage.pageSize,
        appliedFrom: formatUtcDate(range.start),
        appliedTo: formatUtcDate(addUtcDays(range.endExclusive, -1)),
        label: range.label
      },
      filters: {
        categories: categoryCatalog,
        weekStartsOn
      },
      preferences: {
        weekStartsOn
      },
      availableViews: [...dashboardViewModes],
      charts
    };
  }

  async bindByCode(userId: string, dto: BindCoupleDto) {
    const enteredCode = normalizeCoupleCode(dto.code);
    const ownCode = await this.ensureUserCoupleCode(userId);

    if (enteredCode.length < 4) {
      throw new BadRequestException("Couple code must be at least 4 characters");
    }

    if (enteredCode === ownCode) {
      throw new BadRequestException("You cannot connect with your own couple code");
    }

    const partner = await this.prisma.client.user.findFirst({
      where: {
        coupleCode: {
          equals: enteredCode,
          mode: "insensitive"
        }
      },
      select: {
        id: true,
        firstName: true,
        username: true,
        coupleCode: true
      }
    });

    if (!partner || !partner.coupleCode) {
      throw new NotFoundException("No user found with this couple code");
    }

    const [meBind, partnerBind, myMembership, partnerMembership] = await Promise.all([
      this.prisma.client.coupleBind.findUnique({ where: { userId }, select: { coupleId: true } }),
      this.prisma.client.coupleBind.findUnique({ where: { userId: partner.id }, select: { coupleId: true } }),
      this.prisma.client.membership.findFirst({ where: { userId }, orderBy: { createdAt: "asc" }, select: { coupleId: true } }),
      this.prisma.client.membership.findFirst({
        where: { userId: partner.id },
        orderBy: { createdAt: "asc" },
        select: { coupleId: true }
      })
    ]);

    let coupleId = meBind?.coupleId ?? partnerBind?.coupleId ?? myMembership?.coupleId ?? partnerMembership?.coupleId;

    if (!coupleId) {
      const partnerName = partner.firstName ?? partner.username ?? "Partner";
      const created = await this.prisma.client.couple.create({
        data: {
          name: `Shared with ${partnerName}`,
          createdById: userId,
          memberships: {
            create: [{ userId, role: "OWNER" }, { userId: partner.id, role: "PARTNER" }]
          }
        },
        select: { id: true }
      });

      coupleId = created.id;
    } else {
      await Promise.all([
        this.prisma.client.membership.upsert({
          where: {
            userId_coupleId: {
              userId,
              coupleId
            }
          },
          update: {},
          create: {
            userId,
            coupleId,
            role: "PARTNER"
          }
        }),
        this.prisma.client.membership.upsert({
          where: {
            userId_coupleId: {
              userId: partner.id,
              coupleId
            }
          },
          update: {},
          create: {
            userId: partner.id,
            coupleId,
            role: "PARTNER"
          }
        })
      ]);
    }

    await Promise.all([
      this.prisma.client.coupleBind.upsert({
        where: { userId },
        update: {
          coupleId,
          userCoupleCode: ownCode,
          insertedCode: partner.coupleCode
        },
        create: {
          userId,
          coupleId,
          userCoupleCode: ownCode,
          insertedCode: partner.coupleCode
        }
      }),
      this.prisma.client.coupleBind.upsert({
        where: { userId: partner.id },
        update: {
          coupleId,
          userCoupleCode: partner.coupleCode,
          insertedCode: ownCode
        },
        create: {
          userId: partner.id,
          coupleId,
          userCoupleCode: partner.coupleCode,
          insertedCode: ownCode
        }
      })
    ]);

    return this.getProfile(userId);
  }

  async unbindPartner(userId: string) {
    const bind = await this.prisma.client.coupleBind.findUnique({
      where: { userId },
      select: {
        coupleId: true
      }
    });

    if (!bind) {
      throw new BadRequestException("No active partner connection to remove");
    }

    const bindRows = await this.prisma.client.coupleBind.findMany({
      where: {
        coupleId: bind.coupleId
      },
      select: {
        userId: true
      }
    });

    const userIdsToPrepare = Array.from(new Set([userId, ...bindRows.map((item) => item.userId)]));

    await this.prisma.client.$transaction(async (tx) => {
      for (const targetUserId of userIdsToPrepare) {
        const personalWorkspace = await tx.couple.findFirst({
          where: {
            createdById: targetUserId,
            name: "Personal workspace",
            memberships: {
              some: {
                userId: targetUserId
              }
            }
          },
          select: {
            id: true
          }
        });

        if (!personalWorkspace) {
          await tx.couple.create({
            data: {
              name: "Personal workspace",
              createdById: targetUserId,
              memberships: {
                create: {
                  userId: targetUserId,
                  role: "OWNER"
                }
              }
            },
            select: {
              id: true
            }
          });
        }
      }

      await tx.coupleBind.deleteMany({
        where: {
          coupleId: bind.coupleId
        }
      });
    });

    return this.getProfile(userId);
  }

  async getManagedCategories(userId: string) {
    return this.getCategoryCatalog(userId);
  }

  async createCategory(userId: string, dto: CreateCategoryDto) {
    const coupleId = await this.resolveActiveCoupleId(userId, true);

    if (!coupleId) {
      throw new BadRequestException("Could not resolve active workspace");
    }

    await this.assertMembership(userId, coupleId);

    if (dto.scope === "SHARED" && !(await this.hasActivePartnerBind(userId))) {
      throw new BadRequestException("Shared categories are available only when a partner is connected");
    }

    let parentCategoryId: string | null = null;
    if (dto.parentCategoryId) {
      const parent = await this.resolveSelectedCategory(userId, coupleId, dto.kind, dto.parentCategoryId);
      if (parent.parentCategoryId) {
        throw new BadRequestException("Subcategories can only be created one level deep");
      }

      if (parent.scope !== dto.scope) {
        throw new BadRequestException("Subcategory scope must match its parent category");
      }

      parentCategoryId = parent.id;
    }

    await this.createManagedCategory({
      coupleId,
      userId,
      kind: dto.kind,
      scope: dto.scope,
      name: dto.name,
      parentCategoryId
    });

    return this.getCategoryCatalog(userId);
  }

  async deleteCategory(userId: string, categoryId: string) {
    const category = await this.prisma.client.category.findUnique({
      where: { id: categoryId },
      select: {
        id: true,
        coupleId: true,
        scope: true,
        ownerUserId: true,
        childCategories: {
          select: { id: true },
          take: 1
        },
        transactions: {
          select: { id: true },
          take: 1
        }
      }
    });

    if (!category) {
      throw new NotFoundException("Category not found");
    }

    await this.assertMembership(userId, category.coupleId);

    if (category.scope === "PERSONAL" && category.ownerUserId !== userId) {
      throw new BadRequestException("You can delete only your own personal categories");
    }

    if (category.childCategories.length > 0) {
      throw new BadRequestException("Delete subcategories first before removing the parent category");
    }

    if (category.transactions.length > 0) {
      throw new BadRequestException("This category is already used by transactions and cannot be deleted");
    }

    await this.prisma.client.category.delete({
      where: { id: categoryId }
    });

    return this.getCategoryCatalog(userId);
  }

  async updateCategoryVisibility(userId: string, categoryId: string, dto: UpdateCategoryVisibilityDto) {
    const category = await this.prisma.client.category.findUnique({
      where: { id: categoryId },
      select: {
        id: true,
        coupleId: true,
        scope: true,
        ownerUserId: true,
        parentCategoryId: true
      }
    });

    if (!category) {
      throw new NotFoundException("Category not found");
    }

    await this.assertMembership(userId, category.coupleId);

    if (category.scope === "PERSONAL" && category.ownerUserId !== userId) {
      throw new BadRequestException("You can change visibility only for your own personal categories");
    }

    await this.prisma.client.category.updateMany({
      where: category.parentCategoryId
        ? {
            id: categoryId
          }
        : {
            OR: [{ id: categoryId }, { parentCategoryId: categoryId }]
          },
      data: {
        isVisible: dto.isVisible
      }
    });

    return this.getCategoryCatalog(userId);
  }

  async updateCategoryPreferences(userId: string, dto: UpdateCategoryPreferencesDto) {
    const coupleId = await this.resolveActiveCoupleId(userId, true);

    if (!coupleId) {
      throw new BadRequestException("Could not resolve active workspace");
    }

    await this.assertMembership(userId, coupleId);

    const nextIncomeCategoryId = dto.defaultIncomeCategoryId === undefined ? undefined : dto.defaultIncomeCategoryId;
    const nextExpenseCategoryId = dto.defaultExpenseCategoryId === undefined ? undefined : dto.defaultExpenseCategoryId;

    if (nextIncomeCategoryId) {
      await this.resolveSelectedCategory(userId, coupleId, "INCOME", nextIncomeCategoryId);
    }

    if (nextExpenseCategoryId) {
      await this.resolveSelectedCategory(userId, coupleId, "EXPENSE", nextExpenseCategoryId);
    }

    await this.prisma.client.user.update({
      where: { id: userId },
      data: {
        showSharedCategories: dto.showSharedCategories ?? undefined,
        defaultIncomeCategoryId: nextIncomeCategoryId,
        defaultExpenseCategoryId: nextExpenseCategoryId
      }
    });

    return this.getCategoryCatalog(userId);
  }

  async createTransaction(userId: string, dto: CreateProfileTransactionDto) {
    const coupleId = await this.resolveActiveCoupleId(userId, true);

    if (!coupleId) {
      throw new BadRequestException("Could not resolve active couple workspace");
    }

    await this.assertMembership(userId, coupleId);
    const currency = normalizeCurrency(dto.currency);
    const rates = await getLatestCurrencyRates();
    const exchangeRate = rates[currency];
    const amountInUzs = convertToUzs(dto.amount, exchangeRate);

    let categoryId = dto.categoryId ?? null;
    if (!categoryId && dto.categoryName?.trim()) {
      const created = await this.createManagedCategory({
        coupleId,
        userId,
        kind: dto.kind,
        scope: "PERSONAL",
        name: dto.categoryName
      });
      categoryId = created.id;
    }

    if (!categoryId) {
      const preferences = await this.getCategoryPreferences(userId);
      categoryId = dto.kind === "INCOME" ? preferences.defaultIncomeCategoryId : preferences.defaultExpenseCategoryId;
    }

    if (!categoryId) {
      throw new BadRequestException("Choose a category before saving the transaction");
    }

    const category = await this.resolveSelectedCategory(userId, coupleId, dto.kind, categoryId);

    return this.prisma.client.transaction.create({
      data: {
        coupleId,
        userId,
        categoryId: category.id,
        kind: dto.kind,
        amount: dto.amount.toFixed(2),
        currency,
        exchangeRate: exchangeRate.toFixed(6),
        amountInUzs: amountInUzs.toFixed(2),
        note: dto.note,
        happenedAt: new Date()
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            kind: true
          }
        }
      }
    });
  }

  async updateTransaction(userId: string, transactionId: string, dto: UpdateProfileTransactionDto) {
    const transaction = await this.prisma.client.transaction.findUnique({
      where: { id: transactionId },
      select: {
        id: true,
        userId: true,
        coupleId: true,
        kind: true,
        categoryId: true,
        amount: true,
        currency: true
      }
    });

    if (!transaction) {
      throw new NotFoundException("Transaction not found");
    }

    if (transaction.userId !== userId) {
      throw new BadRequestException("You can edit only your own transactions");
    }

    await this.assertMembership(userId, transaction.coupleId);

    const nextKind = dto.kind ?? transaction.kind;
    const nextCurrency = normalizeCurrency(dto.currency ?? transaction.currency);
    let nextCategoryId = transaction.categoryId;

    if (dto.categoryId) {
      nextCategoryId = (await this.resolveSelectedCategory(userId, transaction.coupleId, nextKind, dto.categoryId)).id;
    } else if (dto.categoryName?.trim()) {
      nextCategoryId = (
        await this.createManagedCategory({
          coupleId: transaction.coupleId,
          userId,
          kind: nextKind,
          scope: "PERSONAL",
          name: dto.categoryName
        })
      ).id;
    } else if (dto.kind) {
      const existingCategory = await this.prisma.client.category.findUnique({
        where: { id: transaction.categoryId },
        select: {
          name: true,
          scope: true,
          ownerUserId: true,
          parentCategoryId: true
        }
      });

      if (!existingCategory) {
        throw new NotFoundException("Category not found");
      }

      nextCategoryId = (
        await this.createManagedCategory({
          coupleId: transaction.coupleId,
          userId: existingCategory.scope === "PERSONAL" && existingCategory.ownerUserId ? existingCategory.ownerUserId : userId,
          kind: nextKind,
          scope: existingCategory.scope as CategoryScope,
          name: existingCategory.name,
          parentCategoryId: null
        })
      ).id;
    }

    const nextAmount = dto.amount ?? Number(transaction.amount);
    const rates = await getLatestCurrencyRates();
    const exchangeRate = rates[nextCurrency];
    const amountInUzs = convertToUzs(nextAmount, exchangeRate);

    return this.prisma.client.transaction.update({
      where: { id: transactionId },
      data: {
        kind: nextKind,
        categoryId: nextCategoryId,
        amount: nextAmount.toFixed(2),
        currency: nextCurrency,
        exchangeRate: exchangeRate.toFixed(6),
        amountInUzs: amountInUzs.toFixed(2),
        note: dto.note ?? undefined
      },
      include: {
        category: {
          select: { id: true, name: true, kind: true }
        },
        user: {
          select: {
            firstName: true,
            username: true
          }
        }
      }
    });
  }

  async deleteTransaction(userId: string, transactionId: string) {
    const transaction = await this.prisma.client.transaction.findUnique({
      where: { id: transactionId },
      select: {
        id: true,
        userId: true,
        coupleId: true
      }
    });

    if (!transaction) {
      throw new NotFoundException("Transaction not found");
    }

    if (transaction.userId !== userId) {
      throw new BadRequestException("You can delete only your own transactions");
    }

    await this.assertMembership(userId, transaction.coupleId);

    await this.prisma.client.transaction.delete({
      where: { id: transactionId }
    });

    return { ok: true };
  }

  async recentTransactions(userId: string, range?: Pick<SummaryRange, "start" | "endExclusive">) {
    const coupleId = await this.resolveActiveCoupleId(userId, false);
    if (!coupleId) {
      return [];
    }

    await this.assertMembership(userId, coupleId);

    return this.prisma.client.transaction.findMany({
      where: {
        coupleId,
        ...(range
          ? {
              happenedAt: {
                gte: range.start,
                lt: range.endExclusive
              }
            }
          : {})
      },
      include: {
        category: {
          select: { id: true, name: true, kind: true }
        },
        user: {
          select: {
            firstName: true,
            username: true
          }
        }
      },
      orderBy: {
        happenedAt: "desc"
      },
      take: 20
    });
  }

  private async summarizeRange(userId: string, range: SummaryRange, displayCurrencyRaw?: string) {
    const displayCurrency = normalizeCurrency(displayCurrencyRaw);

    const coupleId = await this.resolveActiveCoupleId(userId, false);
    if (!coupleId) {
      return {
        month: range.month,
        year: range.year,
        currency: displayCurrency,
        totalIncome: 0,
        totalExpense: 0,
        balance: 0,
        personalIncome: 0,
        personalExpense: 0,
        personalBalance: 0
      };
    }

    await this.assertMembership(userId, coupleId);

    const [income, expense, personalIncome, personalExpense] = await Promise.all([
      this.prisma.client.transaction.aggregate({
        where: {
          coupleId,
          kind: "INCOME",
          happenedAt: { gte: range.start, lt: range.endExclusive }
        },
        _sum: { amountInUzs: true }
      }),
      this.prisma.client.transaction.aggregate({
        where: {
          coupleId,
          kind: "EXPENSE",
          happenedAt: { gte: range.start, lt: range.endExclusive }
        },
        _sum: { amountInUzs: true }
      }),
      this.prisma.client.transaction.aggregate({
        where: {
          coupleId,
          userId,
          kind: "INCOME",
          happenedAt: { gte: range.start, lt: range.endExclusive }
        },
        _sum: { amountInUzs: true }
      }),
      this.prisma.client.transaction.aggregate({
        where: {
          coupleId,
          userId,
          kind: "EXPENSE",
          happenedAt: { gte: range.start, lt: range.endExclusive }
        },
        _sum: { amountInUzs: true }
      })
    ]);

    const rates = await getLatestCurrencyRates();
    const displayRate = rates[displayCurrency];
    const totalIncome = convertFromUzs(Number(income._sum.amountInUzs ?? 0), displayRate);
    const totalExpense = convertFromUzs(Number(expense._sum.amountInUzs ?? 0), displayRate);
    const normalizedPersonalIncome = convertFromUzs(Number(personalIncome._sum.amountInUzs ?? 0), displayRate);
    const normalizedPersonalExpense = convertFromUzs(Number(personalExpense._sum.amountInUzs ?? 0), displayRate);

    return {
      month: range.month,
      year: range.year,
      currency: displayCurrency,
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      personalIncome: normalizedPersonalIncome,
      personalExpense: normalizedPersonalExpense,
      personalBalance: normalizedPersonalIncome - normalizedPersonalExpense
    };
  }

  async summary(userId: string, month?: number, year?: number, displayCurrencyRaw?: string) {
    return this.summarizeRange(userId, this.resolveMonthRange(month, year), displayCurrencyRaw);
  }
}
