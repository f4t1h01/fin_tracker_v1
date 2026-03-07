import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";

import { convertFromUzs, convertToUzs, getLatestCurrencyRates, normalizeCurrency, SUPPORTED_CURRENCIES } from "../common/currency";
import { generateCoupleCodeCandidate, normalizeCoupleCode } from "../common/couple-code";
import { PrismaService } from "../prisma/prisma.service";
import { BindCoupleDto } from "./dto/bind-couple.dto";
import { CreateProfileTransactionDto } from "./dto/create-profile-transaction.dto";
import { UpdateProfileDetailsDto } from "./dto/update-profile-details.dto";
import { UpdateProfileTransactionDto } from "./dto/update-profile-transaction.dto";

@Injectable()
export class ProfileService {
  private birthdayColumnExists: boolean | null = null;

  constructor(private readonly prisma: PrismaService) {}

  private async hasBirthdayColumn() {
    if (this.birthdayColumnExists !== null) {
      return this.birthdayColumnExists;
    }

    const result = await this.prisma.client.$queryRawUnsafe<Array<{ exists: boolean }>>(
      `SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'User' AND column_name = 'birthday'
      ) AS "exists"`
    );

    this.birthdayColumnExists = Boolean(result[0]?.exists);
    return this.birthdayColumnExists;
  }

  private async getAuthState(userId: string) {
    const hasBirthdayColumn = await this.hasBirthdayColumn();
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
        isAdmin: true,
        isDark: true
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
      isAdmin: user.isAdmin,
      isDark: user.isDark
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

  private async resolveActiveCoupleId(userId: string, createIfMissing: boolean): Promise<string | null> {
    const [bind, membership] = await Promise.all([
      this.prisma.client.coupleBind.findUnique({
        where: { userId },
        select: { coupleId: true }
      }),
      this.prisma.client.membership.findFirst({
        where: { userId },
        orderBy: { createdAt: "asc" },
        select: { coupleId: true }
      })
    ]);

    if (bind?.coupleId) {
      return bind.coupleId;
    }

    if (membership?.coupleId) {
      return membership.coupleId;
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
        bind: user.coupleBind
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
      bind: user.coupleBind
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

  async snapshot(userId: string, month?: number, year?: number) {
    const [profile, summary, recent, auth] = await Promise.all([
      this.getProfile(userId),
      this.summary(userId, month, year),
      this.recentTransactions(userId),
      this.getAuthState(userId)
    ]);

    return {
      profile,
      summary,
      recent,
      auth
    };
  }

  async dashboard(userId: string, month?: number, year?: number) {
    const [profile, summary, recent, rates] = await Promise.all([
      this.getProfile(userId),
      this.summary(userId, month, year, "UZS"),
      this.recentTransactions(userId),
      getLatestCurrencyRates()
    ]);

    return {
      profile,
      summary,
      recent,
      rates,
      supportedCurrencies: [...SUPPORTED_CURRENCIES]
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

  async createTransaction(userId: string, dto: CreateProfileTransactionDto) {
    const coupleId = await this.resolveActiveCoupleId(userId, true);

    if (!coupleId) {
      throw new BadRequestException("Could not resolve active couple workspace");
    }

    await this.assertMembership(userId, coupleId);

    const categoryName = dto.categoryName.trim();
    const currency = normalizeCurrency(dto.currency);
    const rates = await getLatestCurrencyRates();
    const exchangeRate = rates[currency];
    const amountInUzs = convertToUzs(dto.amount, exchangeRate);

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
          createdById: userId
        }
      }));

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

    if (dto.categoryName || dto.kind) {
      const categoryName = (dto.categoryName ?? "").trim();

      if (!categoryName && dto.kind && !dto.categoryName) {
        const existingCategory = await this.prisma.client.category.findUnique({
          where: { id: transaction.categoryId },
          select: { name: true }
        });

        if (!existingCategory) {
          throw new NotFoundException("Category not found");
        }

        const category =
          (await this.prisma.client.category.findFirst({
            where: {
              coupleId: transaction.coupleId,
              kind: nextKind,
              name: {
                equals: existingCategory.name,
                mode: "insensitive"
              }
            },
            select: { id: true }
          })) ??
          (await this.prisma.client.category.create({
            data: {
              coupleId: transaction.coupleId,
              kind: nextKind,
              name: existingCategory.name,
              createdById: userId
            },
            select: { id: true }
          }));

        nextCategoryId = category.id;
      } else if (categoryName) {
        const category =
          (await this.prisma.client.category.findFirst({
            where: {
              coupleId: transaction.coupleId,
              kind: nextKind,
              name: {
                equals: categoryName,
                mode: "insensitive"
              }
            },
            select: { id: true }
          })) ??
          (await this.prisma.client.category.create({
            data: {
              coupleId: transaction.coupleId,
              kind: nextKind,
              name: categoryName,
              createdById: userId
            },
            select: { id: true }
          }));

        nextCategoryId = category.id;
      }
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
          select: { name: true, kind: true }
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

  async recentTransactions(userId: string) {
    const coupleId = await this.resolveActiveCoupleId(userId, false);
    if (!coupleId) {
      return [];
    }

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

  async summary(userId: string, month?: number, year?: number, displayCurrencyRaw?: string) {
    const now = new Date();
    const normalizedMonth = month ?? now.getMonth() + 1;
    const normalizedYear = year ?? now.getFullYear();
    const displayCurrency = normalizeCurrency(displayCurrencyRaw);

    if (!Number.isInteger(normalizedMonth) || normalizedMonth < 1 || normalizedMonth > 12) {
      throw new BadRequestException("month must be between 1 and 12");
    }

    if (!Number.isInteger(normalizedYear) || normalizedYear < 2000 || normalizedYear > 2200) {
      throw new BadRequestException("year is out of accepted range");
    }

    const coupleId = await this.resolveActiveCoupleId(userId, false);
    if (!coupleId) {
      return {
        month: normalizedMonth,
        year: normalizedYear,
        currency: displayCurrency,
        totalIncome: 0,
        totalExpense: 0,
        balance: 0
      };
    }

    await this.assertMembership(userId, coupleId);

    const start = new Date(Date.UTC(normalizedYear, normalizedMonth - 1, 1));
    const end = new Date(Date.UTC(normalizedYear, normalizedMonth, 1));

    const [income, expense] = await Promise.all([
      this.prisma.client.transaction.aggregate({
        where: {
          coupleId,
          kind: "INCOME",
          happenedAt: { gte: start, lt: end }
        },
        _sum: { amountInUzs: true }
      }),
      this.prisma.client.transaction.aggregate({
        where: {
          coupleId,
          kind: "EXPENSE",
          happenedAt: { gte: start, lt: end }
        },
        _sum: { amountInUzs: true }
      })
    ]);

    const rates = await getLatestCurrencyRates();
    const displayRate = rates[displayCurrency];
    const totalIncome = convertFromUzs(Number(income._sum.amountInUzs ?? 0), displayRate);
    const totalExpense = convertFromUzs(Number(expense._sum.amountInUzs ?? 0), displayRate);

    return {
      month: normalizedMonth,
      year: normalizedYear,
      currency: displayCurrency,
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense
    };
  }
}
