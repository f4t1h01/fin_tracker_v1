import { BadRequestException, Injectable } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";
import { AdminAiUsageQueryDto } from "./dto/admin-ai-usage-query.dto";
import { AdminAuditQueryDto } from "./dto/admin-audit-query.dto";
import { AdminCategoriesQueryDto } from "./dto/admin-categories-query.dto";
import { AdminListQueryDto } from "./dto/admin-list-query.dto";
import { AdminTransactionsQueryDto } from "./dto/admin-transactions-query.dto";

function decimalToNumber(value: { toNumber: () => number } | number | string | null | undefined) {
  if (value === null || value === undefined) {
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

@Injectable()
export class AdminReadService {
  constructor(private readonly prisma: PrismaService) {}

  private get db(): any {
    return this.prisma.client as any;
  }

  private parseDateOnly(value: string) {
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

  private normalizeQueryPage(query?: { page?: number; pageSize?: number }) {
    const page = Math.max(1, query?.page ?? 1);
    const pageSize = Math.min(Math.max(1, query?.pageSize ?? 20), 100);
    return { page, pageSize };
  }

  private buildAiUsageWhere(query?: AdminAiUsageQueryDto) {
    const where: Record<string, unknown> = {};

    if (query?.from || query?.to) {
      const createdAt: { gte?: Date; lt?: Date } = {};

      if (query.from) {
        createdAt.gte = this.parseDateOnly(query.from);
      }

      if (query.to) {
        const toDate = this.parseDateOnly(query.to);
        createdAt.lt = new Date(Date.UTC(toDate.getUTCFullYear(), toDate.getUTCMonth(), toDate.getUTCDate() + 1));
      }

      where.createdAt = createdAt;
    }

    if (query?.model?.trim()) {
      where.model = query.model.trim();
    }

    if (query?.operation?.trim()) {
      where.operation = query.operation.trim().toUpperCase();
    }

    if (query?.status?.trim()) {
      where.status = query.status.trim().toUpperCase();
    }

    if (query?.search?.trim()) {
      const search = query.search.trim();
      where.OR = [
        {
          correlationId: {
            contains: search,
            mode: "insensitive"
          }
        },
        {
          providerRequestId: {
            contains: search,
            mode: "insensitive"
          }
        }
      ];
    }

    return where;
  }

  private buildAiPricingWhere(query?: { model?: string; status?: string }) {
    const where: Record<string, unknown> = {
      provider: "OPENAI"
    };

    if (query?.model?.trim()) {
      where.model = query.model.trim();
    }

    if (query?.status?.trim()) {
      const normalized = query.status.trim().toUpperCase();
      if (normalized === "ACTIVE") {
        where.retiredAt = null;
      } else if (normalized === "RETIRED") {
        where.NOT = {
          retiredAt: null
        };
      }
    }

    return where;
  }

  private buildAuditWhere(query?: AdminAuditQueryDto) {
    const where: Record<string, unknown> = {};

    if (query?.from || query?.to) {
      const createdAt: { gte?: Date; lt?: Date } = {};

      if (query.from) {
        createdAt.gte = this.parseDateOnly(query.from);
      }

      if (query.to) {
        const toDate = this.parseDateOnly(query.to);
        createdAt.lt = new Date(Date.UTC(toDate.getUTCFullYear(), toDate.getUTCMonth(), toDate.getUTCDate() + 1));
      }

      where.createdAt = createdAt;
    }

    if (query?.actionType?.trim()) {
      where.actionType = query.actionType.trim().toUpperCase();
    }

    if (query?.adminEmail?.trim()) {
      where.adminEmail = {
        contains: query.adminEmail.trim(),
        mode: "insensitive"
      };
    }

    if (query?.targetType?.trim()) {
      where.targetType = query.targetType.trim().toUpperCase();
    }

    if (query?.outcome?.trim()) {
      where.outcome = query.outcome.trim().toUpperCase();
    }

    if (query?.search?.trim()) {
      const search = query.search.trim();
      where.OR = [
        { targetId: { contains: search, mode: "insensitive" } },
        { reason: { contains: search, mode: "insensitive" } },
        { errorMessage: { contains: search, mode: "insensitive" } }
      ];
    }

    return where;
  }

  private buildUsersWhere(query: AdminListQueryDto) {
    if (!query.search?.trim()) {
      return {};
    }

    const search = query.search.trim();
    return {
      OR: [
        { email: { contains: search, mode: "insensitive" } },
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { username: { contains: search, mode: "insensitive" } },
        { coupleCode: { contains: search, mode: "insensitive" } }
      ]
    };
  }

  private buildCouplesWhere(query: AdminListQueryDto) {
    if (!query.search?.trim()) {
      return {};
    }

    const search = query.search.trim();
    return {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { id: { contains: search, mode: "insensitive" } },
        {
          memberships: {
            some: {
              user: {
                OR: [
                  { email: { contains: search, mode: "insensitive" } },
                  { firstName: { contains: search, mode: "insensitive" } },
                  { username: { contains: search, mode: "insensitive" } }
                ]
              }
            }
          }
        }
      ]
    };
  }

  private buildTransactionsWhere(query: AdminTransactionsQueryDto) {
    const where: Record<string, unknown> = {};

    if (query.from || query.to) {
      const happenedAt: { gte?: Date; lt?: Date } = {};

      if (query.from) {
        happenedAt.gte = this.parseDateOnly(query.from);
      }

      if (query.to) {
        const toDate = this.parseDateOnly(query.to);
        happenedAt.lt = new Date(Date.UTC(toDate.getUTCFullYear(), toDate.getUTCMonth(), toDate.getUTCDate() + 1));
      }

      where.happenedAt = happenedAt;
    }

    if (query.kind) {
      where.kind = query.kind;
    }

    if (query.currency?.trim()) {
      where.currency = query.currency.trim().toUpperCase();
    }

    if (query.userId?.trim()) {
      where.userId = query.userId.trim();
    }

    if (query.coupleId?.trim()) {
      where.coupleId = query.coupleId.trim();
    }

    if (query.categoryId?.trim()) {
      where.categoryId = query.categoryId.trim();
    }

    if (query.search?.trim()) {
      const search = query.search.trim();
      where.OR = [
        { note: { contains: search, mode: "insensitive" } },
        { id: { contains: search, mode: "insensitive" } },
        { category: { is: { name: { contains: search, mode: "insensitive" } } } },
        { user: { is: { email: { contains: search, mode: "insensitive" } } } }
      ];
    }

    return where;
  }

  private buildCategoriesWhere(query: AdminCategoriesQueryDto) {
    const where: Record<string, unknown> = {};

    if (query.kind) {
      where.kind = query.kind;
    }

    if (query.scope) {
      where.scope = query.scope;
    }

    if (query.coupleId?.trim()) {
      where.coupleId = query.coupleId.trim();
    }

    if (query.ownerUserId?.trim()) {
      where.ownerUserId = query.ownerUserId.trim();
    }

    if (query.isVisible !== undefined) {
      where.isVisible = query.isVisible === "true";
    }

    if (query.search?.trim()) {
      const search = query.search.trim();
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { normalizedName: { contains: search.toLowerCase() } },
        { id: { contains: search, mode: "insensitive" } },
        { couple: { is: { name: { contains: search, mode: "insensitive" } } } }
      ];
    }

    return where;
  }

  async dashboardSummary() {
    const [users, couples, transactions, categories, admins, aiUsage, aiErrors, auditErrors, recentTransactions, recentAiUsage, recentAudit] =
      await Promise.all([
        this.db.user.count(),
        this.db.couple.count(),
        this.db.transaction.count(),
        this.db.category.count(),
        this.db.zeroAdmin.count(),
        this.db.aiUsageLog.aggregate({
          _count: { _all: true },
          _sum: { totalCostMicros: true }
        }),
        this.db.aiUsageLog.count({
          where: { status: "ERROR" }
        }),
        this.db.adminAuditLog.count({
          where: { outcome: "ERROR" }
        }),
        this.db.transaction.findMany({
          orderBy: { happenedAt: "desc" },
          take: 5,
          include: {
            category: { select: { id: true, name: true } },
            user: { select: { id: true, firstName: true, username: true, email: true } },
            couple: { select: { id: true, name: true } }
          }
        }),
        this.db.aiUsageLog.findMany({
          orderBy: { createdAt: "desc" },
          take: 5,
          where: { status: "ERROR" },
          include: {
            user: { select: { id: true, firstName: true, username: true, email: true } },
            couple: { select: { id: true, name: true } }
          }
        }),
        this.db.adminAuditLog.findMany({
          orderBy: { createdAt: "desc" },
          take: 5
        })
      ]);

    return {
      metrics: {
        users,
        couples,
        transactions,
        categories,
        admins,
        aiRequests: aiUsage._count._all,
        aiSpendMicros: Number(aiUsage._sum.totalCostMicros ?? 0n),
        aiErrors,
        auditErrors
      },
      recentActivity: {
        transactions: recentTransactions.map((item: any) => ({
          id: item.id,
          kind: item.kind,
          amount: decimalToNumber(item.amount),
          currency: item.currency,
          happenedAt: item.happenedAt.toISOString(),
          category: item.category,
          user: item.user,
          couple: item.couple
        })),
        aiErrors: recentAiUsage.map((item: any) => ({
          id: item.id,
          model: item.model,
          operation: item.operation,
          errorMessage: item.errorMessage,
          createdAt: item.createdAt.toISOString(),
          user: item.user,
          couple: item.couple
        })),
        audit: recentAudit.map((item: any) => ({
          id: item.id,
          adminEmail: item.adminEmail,
          actionType: item.actionType,
          targetType: item.targetType,
          targetId: item.targetId,
          outcome: item.outcome,
          createdAt: item.createdAt.toISOString(),
          errorMessage: item.errorMessage
        }))
      }
    };
  }

  async usersList(query: AdminListQueryDto) {
    const { page, pageSize } = this.normalizeQueryPage(query);
    const where = this.buildUsersWhere(query);
    const [items, totalItems] = await Promise.all([
      this.db.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          coupleBind: {
            select: {
              coupleId: true,
              insertedCode: true,
              updatedAt: true,
              couple: { select: { id: true, name: true } }
            }
          },
          memberships: {
            select: {
              role: true,
              couple: { select: { id: true, name: true } }
            }
          },
          _count: {
            select: {
              transactions: true,
              aiUsageLogs: true
            }
          }
        }
      }),
      this.db.user.count({ where })
    ]);

    return {
      items: items.map((item: any) => ({
        id: item.id,
        telegramId: item.telegramId.toString(),
        email: item.email,
        firstName: item.firstName,
        lastName: item.lastName,
        username: item.username,
        coupleCode: item.coupleCode,
        isAdmin: item.isAdmin,
        createdAt: item.createdAt.toISOString(),
        bind: item.coupleBind
          ? {
              coupleId: item.coupleBind.coupleId,
              insertedCode: item.coupleBind.insertedCode,
              updatedAt: item.coupleBind.updatedAt.toISOString(),
              couple: item.coupleBind.couple
            }
          : null,
        memberships: item.memberships.map((membership: any) => ({
          role: membership.role,
          couple: membership.couple
        })),
        counts: {
          transactions: item._count.transactions,
          aiUsage: item._count.aiUsageLogs
        }
      })),
      page,
      pageSize,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / pageSize))
    };
  }

  async userDetail(id: string) {
    const user = await this.db.user.findUnique({
      where: { id },
      include: {
        coupleBind: { include: { couple: { select: { id: true, name: true } } } },
        memberships: { include: { couple: { select: { id: true, name: true } } } },
        defaultIncomeCategory: { select: { id: true, name: true } },
        defaultExpenseCategory: { select: { id: true, name: true } }
      }
    });

    if (!user) {
      throw new BadRequestException("User not found");
    }

    const [transactionSummary, recentTransactions, recentAiUsage] = await Promise.all([
      this.db.transaction.aggregate({
        where: { userId: id },
        _count: { _all: true },
        _sum: { amountInUzs: true }
      }),
      this.db.transaction.findMany({
        where: { userId: id },
        orderBy: { happenedAt: "desc" },
        take: 10,
        include: {
          category: { select: { id: true, name: true, kind: true } },
          couple: { select: { id: true, name: true } }
        }
      }),
      this.db.aiUsageLog.findMany({
        where: { userId: id },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { couple: { select: { id: true, name: true } } }
      })
    ]);

    return {
      user: {
        id: user.id,
        telegramId: user.telegramId.toString(),
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        coupleCode: user.coupleCode,
        isAdmin: user.isAdmin,
        showSharedCategories: user.showSharedCategories,
        weekStartsOn: user.weekStartsOn,
        createdAt: user.createdAt.toISOString(),
        bind: user.coupleBind
          ? {
              coupleId: user.coupleBind.coupleId,
              insertedCode: user.coupleBind.insertedCode,
              updatedAt: user.coupleBind.updatedAt.toISOString(),
              couple: user.coupleBind.couple
            }
          : null,
        memberships: user.memberships.map((membership: any) => ({
          role: membership.role,
          createdAt: membership.createdAt.toISOString(),
          couple: membership.couple
        })),
        defaults: {
          income: user.defaultIncomeCategory,
          expense: user.defaultExpenseCategory
        }
      },
      summary: {
        transactionCount: transactionSummary._count._all,
        totalAmountInUzs: decimalToNumber(transactionSummary._sum.amountInUzs)
      },
      recentTransactions: recentTransactions.map((item: any) => ({
        id: item.id,
        kind: item.kind,
        amount: decimalToNumber(item.amount),
        amountInUzs: decimalToNumber(item.amountInUzs),
        currency: item.currency,
        note: item.note,
        happenedAt: item.happenedAt.toISOString(),
        category: item.category,
        couple: item.couple
      })),
      recentAiUsage: recentAiUsage.map((item: any) => ({
        id: item.id,
        model: item.model,
        operation: item.operation,
        status: item.status,
        totalTokens: item.totalTokens ?? 0,
        totalCostMicros: Number(item.totalCostMicros ?? 0n),
        createdAt: item.createdAt.toISOString(),
        couple: item.couple
      }))
    };
  }

  async couplesList(query: AdminListQueryDto) {
    const { page, pageSize } = this.normalizeQueryPage(query);
    const where = this.buildCouplesWhere(query);
    const [items, totalItems] = await Promise.all([
      this.db.couple.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          memberships: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  username: true,
                  email: true
                }
              }
            }
          },
          invites: {
            where: {
              consumedAt: null,
              expiresAt: { gt: new Date() }
            },
            select: { id: true }
          },
          _count: {
            select: {
              transactions: true,
              categories: true,
              aiUsageLogs: true
            }
          }
        }
      }),
      this.db.couple.count({ where })
    ]);

    return {
      items: items.map((item: any) => ({
        id: item.id,
        name: item.name,
        createdAt: item.createdAt.toISOString(),
        members: item.memberships.map((membership: any) => ({
          role: membership.role,
          user: membership.user
        })),
        openInviteCount: item.invites.length,
        counts: {
          transactions: item._count.transactions,
          categories: item._count.categories,
          aiUsage: item._count.aiUsageLogs
        }
      })),
      page,
      pageSize,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / pageSize))
    };
  }

  async coupleDetail(id: string) {
    const couple = await this.db.couple.findUnique({
      where: { id },
      include: {
        memberships: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                username: true,
                email: true
              }
            }
          }
        },
        coupleBinds: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                username: true,
                email: true
              }
            }
          }
        },
        invites: {
          orderBy: {
            createdAt: "desc"
          }
        }
      }
    });

    if (!couple) {
      throw new BadRequestException("Couple not found");
    }

    const [categorySummary, recentTransactions, recentAiUsage] = await Promise.all([
      this.db.category.groupBy({
        by: ["scope", "kind"],
        where: { coupleId: id },
        _count: { _all: true }
      }),
      this.db.transaction.findMany({
        where: { coupleId: id },
        orderBy: { happenedAt: "desc" },
        take: 10,
        include: {
          category: { select: { id: true, name: true, kind: true } },
          user: { select: { id: true, firstName: true, username: true, email: true } }
        }
      }),
      this.db.aiUsageLog.findMany({
        where: { coupleId: id },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          user: { select: { id: true, firstName: true, username: true, email: true } }
        }
      })
    ]);

    return {
      couple: {
        id: couple.id,
        name: couple.name,
        createdAt: couple.createdAt.toISOString(),
        members: couple.memberships.map((membership: any) => ({
          role: membership.role,
          createdAt: membership.createdAt.toISOString(),
          user: membership.user
        })),
        binds: couple.coupleBinds.map((bind: any) => ({
          id: bind.id,
          insertedCode: bind.insertedCode,
          userCoupleCode: bind.userCoupleCode,
          updatedAt: bind.updatedAt.toISOString(),
          user: bind.user
        })),
        invites: couple.invites.map((invite: any) => ({
          id: invite.id,
          code: invite.code,
          expiresAt: invite.expiresAt.toISOString(),
          consumedAt: invite.consumedAt?.toISOString() ?? null,
          createdAt: invite.createdAt.toISOString()
        }))
      },
      categorySummary: categorySummary.map((item: any) => ({
        scope: item.scope,
        kind: item.kind,
        count: item._count._all
      })),
      recentTransactions: recentTransactions.map((item: any) => ({
        id: item.id,
        kind: item.kind,
        amount: decimalToNumber(item.amount),
        amountInUzs: decimalToNumber(item.amountInUzs),
        currency: item.currency,
        note: item.note,
        happenedAt: item.happenedAt.toISOString(),
        category: item.category,
        user: item.user
      })),
      recentAiUsage: recentAiUsage.map((item: any) => ({
        id: item.id,
        model: item.model,
        operation: item.operation,
        status: item.status,
        totalTokens: item.totalTokens ?? 0,
        totalCostMicros: Number(item.totalCostMicros ?? 0n),
        createdAt: item.createdAt.toISOString(),
        user: item.user
      }))
    };
  }

  async transactionsList(query: AdminTransactionsQueryDto) {
    const { page, pageSize } = this.normalizeQueryPage(query);
    const where = this.buildTransactionsWhere(query);
    const [items, totalItems] = await Promise.all([
      this.db.transaction.findMany({
        where,
        orderBy: { happenedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          category: { select: { id: true, name: true, kind: true } },
          user: { select: { id: true, firstName: true, username: true, email: true } },
          couple: { select: { id: true, name: true } }
        }
      }),
      this.db.transaction.count({ where })
    ]);

    return {
      items: items.map((item: any) => ({
        id: item.id,
        kind: item.kind,
        amount: decimalToNumber(item.amount),
        amountInUzs: decimalToNumber(item.amountInUzs),
        currency: item.currency,
        exchangeRate: decimalToNumber(item.exchangeRate),
        note: item.note,
        happenedAt: item.happenedAt.toISOString(),
        createdAt: item.createdAt.toISOString(),
        category: item.category,
        user: item.user,
        couple: item.couple
      })),
      page,
      pageSize,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / pageSize))
    };
  }

  async transactionDetail(id: string) {
    const transaction = await this.db.transaction.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true, kind: true } },
        user: { select: { id: true, firstName: true, username: true, email: true } },
        couple: { select: { id: true, name: true } }
      }
    });

    if (!transaction) {
      throw new BadRequestException("Transaction not found");
    }

    const categories = await this.db.category.findMany({
      where: {
        coupleId: transaction.coupleId,
        kind: transaction.kind
      },
      orderBy: [{ scope: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        scope: true
      }
    });

    return {
      transaction: {
        id: transaction.id,
        kind: transaction.kind,
        amount: decimalToNumber(transaction.amount),
        amountInUzs: decimalToNumber(transaction.amountInUzs),
        currency: transaction.currency,
        exchangeRate: decimalToNumber(transaction.exchangeRate),
        note: transaction.note,
        happenedAt: transaction.happenedAt.toISOString(),
        createdAt: transaction.createdAt.toISOString(),
        updatedAt: transaction.updatedAt.toISOString(),
        category: transaction.category,
        user: transaction.user,
        couple: transaction.couple
      },
      availableCategories: categories
    };
  }

  async categoriesList(query: AdminCategoriesQueryDto) {
    const { page, pageSize } = this.normalizeQueryPage(query);
    const where = this.buildCategoriesWhere(query);
    const [items, totalItems] = await Promise.all([
      this.db.category.findMany({
        where,
        orderBy: [{ createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          couple: { select: { id: true, name: true } },
          ownerUser: { select: { id: true, firstName: true, username: true, email: true } },
          parentCategory: { select: { id: true, name: true } },
          childCategories: { select: { id: true } },
          _count: { select: { transactions: true } }
        }
      }),
      this.db.category.count({ where })
    ]);

    return {
      items: items.map((item: any) => ({
        id: item.id,
        name: item.name,
        kind: item.kind,
        scope: item.scope,
        isVisible: item.isVisible,
        createdAt: item.createdAt.toISOString(),
        couple: item.couple,
        ownerUser: item.ownerUser,
        parentCategory: item.parentCategory,
        childCount: item.childCategories.length,
        transactionCount: item._count.transactions
      })),
      page,
      pageSize,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / pageSize))
    };
  }

  async categoryDetail(id: string) {
    const category = await this.db.category.findUnique({
      where: { id },
      include: {
        couple: { select: { id: true, name: true } },
        ownerUser: { select: { id: true, firstName: true, username: true, email: true } },
        parentCategory: { select: { id: true, name: true } },
        childCategories: {
          select: {
            id: true,
            name: true,
            isVisible: true
          }
        }
      }
    });

    if (!category) {
      throw new BadRequestException("Category not found");
    }

    const [usage, availableParents] = await Promise.all([
      this.db.transaction.aggregate({
        where: { categoryId: id },
        _count: { _all: true },
        _sum: { amountInUzs: true }
      }),
      this.db.category.findMany({
        where: {
          coupleId: category.coupleId,
          kind: category.kind,
          id: { not: category.id },
          parentCategoryId: null
        },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          scope: true,
          ownerUserId: true
        }
      })
    ]);

    return {
      category: {
        id: category.id,
        name: category.name,
        kind: category.kind,
        scope: category.scope,
        isVisible: category.isVisible,
        createdAt: category.createdAt.toISOString(),
        couple: category.couple,
        ownerUser: category.ownerUser,
        parentCategory: category.parentCategory,
        children: category.childCategories
      },
      usage: {
        transactionCount: usage._count._all,
        totalAmountInUzs: decimalToNumber(usage._sum.amountInUzs)
      },
      availableParents
    };
  }

  async securitySummary() {
    const [admins, failedLogins, recentAudit] = await Promise.all([
      this.db.zeroAdmin.findMany({
        orderBy: { email: "asc" },
        select: {
          email: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true
        }
      }),
      this.db.adminAuditLog.count({
        where: {
          actionType: "ADMIN_LOGIN",
          outcome: "ERROR"
        }
      }),
      this.db.adminAuditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        where: {
          targetType: "ADMIN"
        }
      })
    ]);

    return {
      admins: admins.map((item: any) => ({
        email: item.email,
        isActive: item.isActive,
        lastLoginAt: item.lastLoginAt?.toISOString() ?? null,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString()
      })),
      stats: {
        totalAdmins: admins.length,
        failedLogins
      },
      recentAudit: recentAudit.map((item: any) => ({
        id: item.id,
        adminEmail: item.adminEmail,
        actionType: item.actionType,
        outcome: item.outcome,
        createdAt: item.createdAt.toISOString(),
        errorMessage: item.errorMessage,
        targetId: item.targetId
      }))
    };
  }

  async aiUsageSummary(query?: AdminAiUsageQueryDto) {
    const where = this.buildAiUsageWhere(query);
    const [aggregate, perModel] = await Promise.all([
      this.db.aiUsageLog.aggregate({
        where,
        _count: { _all: true },
        _sum: {
          inputTokens: true,
          outputTokens: true,
          totalTokens: true,
          totalCostMicros: true
        }
      }),
      this.db.aiUsageLog.groupBy({
        by: ["model"],
        where,
        _count: { _all: true },
        _sum: {
          inputTokens: true,
          outputTokens: true,
          totalTokens: true,
          totalCostMicros: true
        },
        orderBy: { model: "asc" }
      })
    ]);

    return {
      totals: {
        requests: aggregate._count._all,
        inputTokens: aggregate._sum.inputTokens ?? 0,
        outputTokens: aggregate._sum.outputTokens ?? 0,
        totalTokens: aggregate._sum.totalTokens ?? 0,
        totalCostMicros: Number(aggregate._sum.totalCostMicros ?? 0n)
      },
      perModel: perModel.map((item: any) => ({
        model: item.model,
        requests: item._count._all,
        inputTokens: item._sum.inputTokens ?? 0,
        outputTokens: item._sum.outputTokens ?? 0,
        totalTokens: item._sum.totalTokens ?? 0,
        totalCostMicros: Number(item._sum.totalCostMicros ?? 0n)
      }))
    };
  }

  async aiUsageList(query?: AdminAiUsageQueryDto) {
    const where = this.buildAiUsageWhere(query);
    const { page, pageSize } = this.normalizeQueryPage(query);
    const [items, totalItems] = await Promise.all([
      this.db.aiUsageLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              username: true,
              email: true
            }
          },
          couple: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }),
      this.db.aiUsageLog.count({ where })
    ]);

    return {
      items: items.map((item: any) => ({
        id: item.id,
        provider: item.provider,
        feature: item.feature,
        operation: item.operation,
        status: item.status,
        model: item.model,
        endpoint: item.endpoint,
        correlationId: item.correlationId,
        providerRequestId: item.providerRequestId,
        inputTokens: item.inputTokens ?? 0,
        outputTokens: item.outputTokens ?? 0,
        totalTokens: item.totalTokens ?? 0,
        totalCostMicros: Number(item.totalCostMicros ?? 0n),
        inputCostMicros: Number(item.inputCostMicros ?? 0n),
        outputCostMicros: Number(item.outputCostMicros ?? 0n),
        errorMessage: item.errorMessage,
        createdAt: item.createdAt.toISOString(),
        user: item.user,
        couple: item.couple
      })),
      page,
      pageSize,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / pageSize))
    };
  }

  async aiPricingList(query?: { model?: string; status?: string; page?: number; pageSize?: number }) {
    const where = this.buildAiPricingWhere(query);
    const { page, pageSize } = this.normalizeQueryPage(query);

    const [items, totalItems, activeItems] = await Promise.all([
      this.db.aiModelPricing.findMany({
        where,
        orderBy: [{ effectiveFrom: "desc" }, { createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      this.db.aiModelPricing.count({ where }),
      this.db.aiModelPricing.findMany({
        where: {
          provider: "OPENAI",
          retiredAt: null
        },
        orderBy: [{ model: "asc" }, { effectiveFrom: "desc" }, { createdAt: "desc" }]
      })
    ]);

    const uniqueActiveItems = activeItems.filter((item: any, index: number, array: any[]) => array.findIndex((candidate) => candidate.model === item.model) === index);

    return {
      currentByModel: uniqueActiveItems.map((item: any) => ({
        id: item.id,
        provider: item.provider,
        model: item.model,
        textInputMicrosPer1m: Number(item.textInputMicrosPer1m ?? 0n),
        audioInputMicrosPer1m: Number(item.audioInputMicrosPer1m ?? 0n),
        textOutputMicrosPer1m: Number(item.textOutputMicrosPer1m ?? 0n),
        audioOutputMicrosPer1m: Number(item.audioOutputMicrosPer1m ?? 0n),
        notes: item.notes,
        effectiveFrom: item.effectiveFrom.toISOString(),
        retiredAt: item.retiredAt?.toISOString() ?? null,
        createdByAdminEmail: item.createdByAdminEmail,
        createdAt: item.createdAt.toISOString()
      })),
      items: items.map((item: any) => ({
        id: item.id,
        provider: item.provider,
        model: item.model,
        textInputMicrosPer1m: Number(item.textInputMicrosPer1m ?? 0n),
        audioInputMicrosPer1m: Number(item.audioInputMicrosPer1m ?? 0n),
        textOutputMicrosPer1m: Number(item.textOutputMicrosPer1m ?? 0n),
        audioOutputMicrosPer1m: Number(item.audioOutputMicrosPer1m ?? 0n),
        notes: item.notes,
        effectiveFrom: item.effectiveFrom.toISOString(),
        retiredAt: item.retiredAt?.toISOString() ?? null,
        createdByAdminEmail: item.createdByAdminEmail,
        createdAt: item.createdAt.toISOString()
      })),
      page,
      pageSize,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / pageSize))
    };
  }

  async auditList(query: AdminAuditQueryDto) {
    const { page, pageSize } = this.normalizeQueryPage(query);
    const where = this.buildAuditWhere(query);
    const [items, totalItems] = await Promise.all([
      this.db.adminAuditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      this.db.adminAuditLog.count({ where })
    ]);

    return {
      items: items.map((item: any) => ({
        id: item.id,
        adminEmail: item.adminEmail,
        actionType: item.actionType,
        targetType: item.targetType,
        targetId: item.targetId,
        reason: item.reason,
        requestMetadata: item.requestMetadata,
        beforeState: item.beforeState,
        afterState: item.afterState,
        outcome: item.outcome,
        errorMessage: item.errorMessage,
        createdAt: item.createdAt.toISOString()
      })),
      page,
      pageSize,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / pageSize))
    };
  }
}
