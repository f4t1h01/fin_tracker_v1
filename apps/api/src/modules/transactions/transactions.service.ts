import { ForbiddenException, Injectable } from "@nestjs/common";

import { convertToUzs, getLatestCurrencyRates, normalizeCurrency } from "../common/currency";
import { PrismaService } from "../prisma/prisma.service";
import { CreateTransactionDto } from "./dto/create-transaction.dto";

@Injectable()
export class TransactionsService {
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

  async create(userId: string, dto: CreateTransactionDto) {
    await this.assertMembership(userId, dto.coupleId);

    const normalizedCategoryName = dto.categoryName.trim();
    const normalizedCategoryLookupName = normalizedCategoryName.toLowerCase();
    const currency = normalizeCurrency(dto.currency);
    const rates = await getLatestCurrencyRates();
    const exchangeRate = rates[currency];
    const amountInUzs = convertToUzs(dto.amount, exchangeRate);

    const category =
      (await this.prisma.client.category.findFirst({
        where: {
          coupleId: dto.coupleId,
          kind: dto.kind,
          normalizedName: normalizedCategoryLookupName,
          scope: "SHARED"
        }
      })) ??
      (await this.prisma.client.category.create({
        data: {
          coupleId: dto.coupleId,
          kind: dto.kind,
          scope: "SHARED",
          name: normalizedCategoryName,
          normalizedName: normalizedCategoryLookupName,
          createdById: userId
        }
      }));

    return this.prisma.client.transaction.create({
      data: {
        userId,
        coupleId: dto.coupleId,
        categoryId: category.id,
        kind: dto.kind,
        amount: dto.amount.toFixed(2),
        currency,
        exchangeRate: exchangeRate.toFixed(6),
        amountInUzs: amountInUzs.toFixed(2),
        note: dto.note,
        happenedAt: new Date(dto.happenedAt)
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

  async listRecent(userId: string, coupleId: string) {
    await this.assertMembership(userId, coupleId);

    return this.prisma.client.transaction.findMany({
      where: { coupleId },
      include: {
        category: {
          select: { name: true, kind: true }
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
}
