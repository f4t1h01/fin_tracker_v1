import { ForbiddenException, Injectable } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class SummaryService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertMembership(userId: string, coupleId: string) {
    const membership = await this.prisma.client.membership.findUnique({
      where: {
        userId_coupleId: {
          userId,
          coupleId
        }
      }
    });

    if (!membership) {
      throw new ForbiddenException("You do not belong to this couple workspace");
    }
  }

  async monthly(userId: string, coupleId: string, month: number, year: number) {
    await this.assertMembership(userId, coupleId);

    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 1));

    const [income, expense, byCategory] = await Promise.all([
      this.prisma.client.transaction.aggregate({
        where: {
          coupleId,
          kind: "INCOME",
          happenedAt: { gte: start, lt: end }
        },
        _sum: { amount: true }
      }),
      this.prisma.client.transaction.aggregate({
        where: {
          coupleId,
          kind: "EXPENSE",
          happenedAt: { gte: start, lt: end }
        },
        _sum: { amount: true }
      }),
      this.prisma.client.transaction.groupBy({
        by: ["categoryId"],
        where: {
          coupleId,
          happenedAt: { gte: start, lt: end }
        },
        _sum: {
          amount: true
        },
        orderBy: {
          _sum: {
            amount: "desc"
          }
        }
      })
    ]);

    const categories = await this.prisma.client.category.findMany({
      where: {
        id: {
          in: byCategory.map((item) => item.categoryId)
        }
      },
      select: {
        id: true,
        name: true,
        kind: true
      }
    });

    const categoryMap = new Map(categories.map((category) => [category.id, category]));
    const totalIncome = Number(income._sum.amount ?? 0);
    const totalExpense = Number(expense._sum.amount ?? 0);

    return {
      month,
      year,
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      byCategory: byCategory.map((entry) => ({
        categoryId: entry.categoryId,
        name: categoryMap.get(entry.categoryId)?.name ?? "Unknown",
        kind: categoryMap.get(entry.categoryId)?.kind ?? "EXPENSE",
        amount: Number(entry._sum.amount ?? 0)
      }))
    };
  }
}
