import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { parseApiEnv } from "@repo/config";

import { resolveTelegramLinkToken } from "../auth/telegram-link-token";
import { convertToUzs, getLatestCurrencyRates, normalizeCurrency } from "../common/currency";
import { generateCoupleCodeCandidate } from "../common/couple-code";
import { PrismaService } from "../prisma/prisma.service";
import { LinkTelegramProfileDto } from "./dto/link-telegram-profile.dto";
import { QuickAddDto } from "./dto/quick-add.dto";
import { StoreTelegramPhoneDto } from "./dto/store-telegram-phone.dto";

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

  private resolveLinkTokenUserId(linkToken: string) {
    const env = parseApiEnv(process.env);
    const parsed = resolveTelegramLinkToken(linkToken, env.API_JWT_SECRET);

    if (!parsed) {
      throw new ForbiddenException("Telegram link token is invalid or expired");
    }

    return parsed.userId;
  }

  private async mergeTelegramStubIntoUser(sourceUserId: string, targetUserId: string) {
    if (sourceUserId === targetUserId) {
      return;
    }

    await this.prisma.client.$transaction(async (tx) => {
      const [sourceUser, targetUser] = await Promise.all([
        tx.user.findUnique({
          where: { id: sourceUserId },
          select: {
            id: true,
            coupleCode: true,
            telegramPhone: true,
            photoUrl: true
          }
        }),
        tx.user.findUnique({
          where: { id: targetUserId },
          select: {
            id: true,
            coupleCode: true,
            telegramPhone: true,
            photoUrl: true
          }
        })
      ]);

      if (!sourceUser || !targetUser) {
        throw new NotFoundException("Could not merge Telegram account");
      }

      const sourceMemberships = await tx.membership.findMany({
        where: { userId: sourceUserId },
        select: { id: true, coupleId: true }
      });
      const targetMemberships = await tx.membership.findMany({
        where: { userId: targetUserId },
        select: { coupleId: true }
      });

      const targetCoupleIds = new Set(targetMemberships.map((item) => item.coupleId));

      for (const membership of sourceMemberships) {
        if (targetCoupleIds.has(membership.coupleId)) {
          await tx.membership.delete({ where: { id: membership.id } });
          continue;
        }

        await tx.membership.update({
          where: { id: membership.id },
          data: { userId: targetUserId }
        });
        targetCoupleIds.add(membership.coupleId);
      }

      const [sourceBind, targetBind] = await Promise.all([
        tx.coupleBind.findUnique({ where: { userId: sourceUserId }, select: { id: true } }),
        tx.coupleBind.findUnique({ where: { userId: targetUserId }, select: { id: true } })
      ]);

      if (sourceBind) {
        if (targetBind) {
          await tx.coupleBind.delete({ where: { id: sourceBind.id } });
        } else {
          await tx.coupleBind.update({
            where: { id: sourceBind.id },
            data: { userId: targetUserId }
          });
        }
      }

      await Promise.all([
        tx.transaction.updateMany({ where: { userId: sourceUserId }, data: { userId: targetUserId } }),
        tx.category.updateMany({ where: { createdById: sourceUserId }, data: { createdById: targetUserId } }),
        tx.couple.updateMany({ where: { createdById: sourceUserId }, data: { createdById: targetUserId } }),
        tx.invite.updateMany({ where: { createdById: sourceUserId }, data: { createdById: targetUserId } })
      ]);

      await tx.user.update({
        where: { id: targetUserId },
        data: {
          ...(targetUser.coupleCode ? {} : sourceUser.coupleCode ? { coupleCode: sourceUser.coupleCode } : {}),
          ...(targetUser.telegramPhone ? {} : sourceUser.telegramPhone ? { telegramPhone: sourceUser.telegramPhone } : {}),
          ...(targetUser.photoUrl ? {} : sourceUser.photoUrl ? { photoUrl: sourceUser.photoUrl } : {})
        }
      });

      await tx.user.delete({ where: { id: sourceUserId } });
    });
  }

  async linkTelegramProfile(dto: LinkTelegramProfileDto) {
    const targetUserId = this.resolveLinkTokenUserId(dto.linkToken);
    const telegramId = BigInt(dto.telegramId);
    const chatId = dto.chatId ? BigInt(dto.chatId) : null;

    const [targetUser, existingTelegramUser] = await Promise.all([
      this.prisma.client.user.findUnique({
        where: { id: targetUserId },
        select: {
          id: true,
          email: true,
          passwordHash: true
        }
      }),
      this.prisma.client.user.findUnique({
        where: { telegramId },
        select: {
          id: true,
          email: true,
          passwordHash: true
        }
      })
    ]);

    if (!targetUser) {
      throw new NotFoundException("Website account was not found");
    }

    if (existingTelegramUser && existingTelegramUser.id !== targetUser.id) {
      const canMergeStub = !existingTelegramUser.email && !existingTelegramUser.passwordHash;
      if (!canMergeStub) {
        throw new ForbiddenException("This Telegram account is already linked to another website account");
      }

      await this.mergeTelegramStubIntoUser(existingTelegramUser.id, targetUser.id);
    }

    const linkedUser = await this.prisma.client.user.update({
      where: { id: targetUser.id },
      data: {
        telegramId,
        ...(chatId ? { lastTelegramChatId: chatId } : {}),
        ...(dto.username !== undefined ? { username: dto.username?.trim() || null } : {}),
        ...(dto.firstName !== undefined ? { firstName: dto.firstName?.trim() || null } : {}),
        ...(dto.lastName !== undefined ? { lastName: dto.lastName?.trim() || null } : {})
      },
      select: {
        id: true,
        telegramId: true,
        username: true,
        firstName: true,
        lastName: true,
        telegramPhone: true
      }
    });

    await this.ensureUserCoupleCode(linkedUser.id);

    return {
      linked: true,
      telegramId: linkedUser.telegramId.toString(),
      username: linkedUser.username,
      firstName: linkedUser.firstName,
      lastName: linkedUser.lastName,
      telegramPhone: linkedUser.telegramPhone
    };
  }

  async storeTelegramPhone(dto: StoreTelegramPhoneDto) {
    const telegramId = BigInt(dto.telegramId);
    const normalizedPhone = dto.phoneNumber.trim();

    const user = await this.prisma.client.user.findUnique({
      where: { telegramId },
      select: { id: true }
    });

    if (!user) {
      throw new NotFoundException("Telegram account was not linked yet");
    }

    const updated = await this.prisma.client.user.update({
      where: { id: user.id },
      data: { telegramPhone: normalizedPhone },
      select: { telegramPhone: true }
    });

    return {
      saved: true,
      telegramPhone: updated.telegramPhone
    };
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
    const normalizedCategoryLookupName = categoryName.toLowerCase();

    const category =
      (await this.prisma.client.category.findFirst({
        where: {
          coupleId,
          kind: dto.kind,
          normalizedName: normalizedCategoryLookupName,
          scope: "SHARED"
        }
      })) ??
      (await this.prisma.client.category.create({
        data: {
          coupleId,
          kind: dto.kind,
          scope: "SHARED",
          name: categoryName,
          normalizedName: normalizedCategoryLookupName,
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
