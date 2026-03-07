import { ForbiddenException, Injectable } from "@nestjs/common";
import { parseApiEnv } from "@repo/config";

import { convertToUzs, getLatestCurrencyRates, normalizeCurrency } from "../common/currency";
import { generateCoupleCodeCandidate } from "../common/couple-code";
import { PrismaService } from "../prisma/prisma.service";
import { QuickAddDto } from "./dto/quick-add.dto";

@Injectable()
export class BotService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureUserCoupleCode(userId: string): Promise<void> {
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const existing = await this.prisma.client.user.findUnique({
        where: { id: userId },
        select: { coupleCode: true }
      });

      if (!existing || existing.coupleCode) {
        return;
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
          return;
        }
      } catch {
        continue;
      }
    }
  }

  verifySecret(secret?: string) {
    const env = parseApiEnv(process.env);
    if (!secret || secret !== env.BOT_SHARED_SECRET) {
      throw new ForbiddenException("Invalid bot secret");
    }
  }

  private async resolveCoupleForUser(userId: string) {
    const membership = await this.prisma.client.membership.findFirst({
      where: { userId },
      orderBy: { createdAt: "asc" }
    });

    if (membership) {
      return membership.coupleId;
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
      }
    });

    return couple.id;
  }

  async quickAdd(dto: QuickAddDto) {
    const telegramId = BigInt(Math.trunc(dto.telegramId));

    const user = await this.prisma.client.user.upsert({
      where: { telegramId },
      create: {
        telegramId,
        firstName: "Telegram",
        username: `tg_${dto.telegramId}`
      },
      update: {}
    });

    await this.ensureUserCoupleCode(user.id);

    const coupleId = await this.resolveCoupleForUser(user.id);
    const currency = normalizeCurrency(dto.currency);
    const rates = await getLatestCurrencyRates();
    const exchangeRate = rates[currency];
    const amountInUzs = convertToUzs(dto.amount, exchangeRate);

    const categoryName = dto.category.trim();

    const category =
      (await this.prisma.client.category.findFirst({
        where: {
          coupleId,
          kind: dto.kind,
          name: {
            equals: categoryName,
            mode: "insensitive"
          }
        }
      })) ??
      (await this.prisma.client.category.create({
        data: {
          coupleId,
          kind: dto.kind,
          name: categoryName,
          createdById: user.id
        }
      }));

    return this.prisma.client.transaction.create({
      data: {
        userId: user.id,
        coupleId,
        categoryId: category.id,
        amount: dto.amount.toFixed(2),
        currency,
        exchangeRate: exchangeRate.toFixed(6),
        amountInUzs: amountInUzs.toFixed(2),
        kind: dto.kind,
        note: dto.note,
        happenedAt: new Date()
      }
    });
  }

  async monthlySummary(telegramIdRaw: string, month: number, year: number) {
    const telegramId = BigInt(Math.trunc(Number(telegramIdRaw)));
    const user = await this.prisma.client.user.findUnique({
      where: { telegramId }
    });

    if (!user) {
      return {
        month,
        year,
        currency: "UZS",
        totalIncome: 0,
        totalExpense: 0,
        balance: 0
      };
    }

    const membership = await this.prisma.client.membership.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" }
    });

    if (!membership) {
      return {
        month,
        year,
        currency: "UZS",
        totalIncome: 0,
        totalExpense: 0,
        balance: 0
      };
    }

    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 1));

    const [income, expense] = await Promise.all([
      this.prisma.client.transaction.aggregate({
        where: {
          coupleId: membership.coupleId,
          kind: "INCOME",
          happenedAt: { gte: start, lt: end }
        },
        _sum: { amountInUzs: true }
      }),
      this.prisma.client.transaction.aggregate({
        where: {
          coupleId: membership.coupleId,
          kind: "EXPENSE",
          happenedAt: { gte: start, lt: end }
        },
        _sum: { amountInUzs: true }
      })
    ]);

    const totalIncome = Number(income._sum.amountInUzs ?? 0);
    const totalExpense = Number(expense._sum.amountInUzs ?? 0);

    return {
      month,
      year,
      currency: "UZS",
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense
    };
  }
}
