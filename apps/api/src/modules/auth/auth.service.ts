import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { parseApiEnv } from "@repo/config";
import { sign, verify } from "jsonwebtoken";
import { createHash, createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

import { generateCoupleCodeCandidate } from "../common/couple-code";
import { PrismaService } from "../prisma/prisma.service";
import { BotWebAppLoginDto } from "./dto/bot-webapp-login.dto";
import { PasswordLoginDto } from "./dto/password-login.dto";
import { PasswordRegisterDto } from "./dto/password-register.dto";
import { PasswordSetupDto } from "./dto/password-setup.dto";
import { TelegramLoginDto } from "./dto/telegram-login.dto";

const scryptAsync = promisify(scrypt);

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private issueAccessToken(userId: string, telegramId: bigint): string {
    const env = parseApiEnv(process.env);
    return sign({ telegramId: telegramId.toString(), sub: userId }, env.API_JWT_SECRET, {
      expiresIn: "7d"
    });
  }

  private async hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16);
    const derived = (await scryptAsync(password, salt, 64)) as Buffer;
    return `scrypt:${salt.toString("hex")}:${derived.toString("hex")}`;
  }

  private async verifyPassword(password: string, storedHash: string): Promise<boolean> {
    const [algorithm, saltHex, digestHex] = storedHash.split(":");

    if (algorithm !== "scrypt" || !saltHex || !digestHex) {
      return false;
    }

    let salt: Buffer;
    let expectedDigest: Buffer;

    try {
      salt = Buffer.from(saltHex, "hex");
      expectedDigest = Buffer.from(digestHex, "hex");
    } catch {
      return false;
    }

    if (expectedDigest.length === 0) {
      return false;
    }

    const derived = (await scryptAsync(password, salt, expectedDigest.length)) as Buffer;

    if (derived.length !== expectedDigest.length) {
      return false;
    }

    return timingSafeEqual(derived, expectedDigest);
  }

  private buildAuthPayload(user: {
    id: string;
    telegramId: bigint;
    username: string | null;
    firstName: string | null;
    lastName: string | null;
    isAdmin: boolean;
    isDark: boolean;
    coupleCode: string;
    email: string | null;
    hasPassword: boolean;
  }) {
    return {
      accessToken: this.issueAccessToken(user.id, user.telegramId),
      user: {
        id: user.id,
        telegramId: user.telegramId.toString(),
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        isAdmin: user.isAdmin,
        isDark: user.isDark,
        coupleCode: user.coupleCode,
        email: user.email,
        hasPassword: user.hasPassword
      }
    };
  }

  private resolveAuthorizedUserId(authorizationHeader?: string): string | null {
    if (!authorizationHeader?.startsWith("Bearer ")) {
      return null;
    }

    const token = authorizationHeader.replace("Bearer ", "").trim();
    if (!token) {
      return null;
    }

    const env = parseApiEnv(process.env);

    try {
      const payload = verify(token, env.API_JWT_SECRET) as { sub?: string };
      return typeof payload.sub === "string" && payload.sub ? payload.sub : null;
    } catch {
      return null;
    }
  }

  private async ensureUserCoupleCode(userId: string): Promise<string> {
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const existing = await this.prisma.client.user.findUnique({
        where: { id: userId },
        select: { coupleCode: true }
      });

      if (!existing) {
        throw new UnauthorizedException("User does not exist");
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

    throw new UnauthorizedException("Failed to generate a unique couple code");
  }

  private generateWebsiteTelegramIdCandidate(): bigint {
    const randomPart = BigInt(randomBytes(4).readUInt32BE(0));
    return -(BigInt(Date.now()) * 1000000n + randomPart);
  }

  private verifyTelegramHash(payload: TelegramLoginDto): boolean {
    const env = parseApiEnv(process.env);
    const entries = Object.entries(payload).filter(([key, value]) => {
      if (key === "hash") {
        return false;
      }
      return value !== undefined && value !== null && String(value).length > 0;
    });

    const dataCheckString = entries
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${String(value)}`)
      .join("\n");

    const secret = createHash("sha256").update(env.TELEGRAM_BOT_TOKEN).digest();
    const digest = createHmac("sha256", secret).update(dataCheckString).digest();

    const incomingHash = Buffer.from(payload.hash, "hex");
    if (incomingHash.length !== digest.length) {
      return false;
    }

    return timingSafeEqual(digest, incomingHash);
  }

  private verifyBotWebAppSignature(payload: BotWebAppLoginDto): boolean {
    const env = parseApiEnv(process.env);
    const now = Math.floor(Date.now() / 1000);

    if (Math.abs(now - payload.timestamp) > 600) {
      return false;
    }

    const signaturePayload = payload.chatId
      ? `${payload.telegramId}:${payload.chatId}:${payload.timestamp}`
      : `${payload.telegramId}:${payload.timestamp}`;

    const digest = createHmac("sha256", env.BOT_SHARED_SECRET).update(signaturePayload).digest();

    const incomingHash = Buffer.from(payload.signature, "hex");
    if (incomingHash.length !== digest.length) {
      return false;
    }

    return timingSafeEqual(digest, incomingHash);
  }

  async loginWithTelegram(payload: TelegramLoginDto, authorizationHeader?: string) {
    if (!this.verifyTelegramHash(payload)) {
      throw new UnauthorizedException("Telegram login signature is invalid");
    }

    const telegramId = BigInt(payload.id);
    const authorizedUserId = this.resolveAuthorizedUserId(authorizationHeader);

    if (authorizedUserId) {
      const existingByTelegramId = await this.prisma.client.user.findUnique({
        where: { telegramId },
        select: { id: true }
      });

      if (existingByTelegramId && existingByTelegramId.id !== authorizedUserId) {
        throw new ConflictException("This Telegram account is already linked to another user");
      }

      const linkedUser = await this.prisma.client.user.update({
        where: { id: authorizedUserId },
        data: {
          telegramId,
          lastTelegramChatId: telegramId,
          username: payload.username,
          firstName: payload.first_name,
          lastName: payload.last_name,
          photoUrl: payload.photo_url
        }
      });

      const linkedCoupleCode = await this.ensureUserCoupleCode(linkedUser.id);
      return this.buildAuthPayload({
        id: linkedUser.id,
        telegramId: linkedUser.telegramId,
        username: linkedUser.username,
        firstName: linkedUser.firstName,
        lastName: linkedUser.lastName,
        isAdmin: linkedUser.isAdmin,
        isDark: linkedUser.isDark,
        coupleCode: linkedCoupleCode,
        email: linkedUser.email,
        hasPassword: Boolean(linkedUser.passwordHash)
      });
    }

    const user = await this.prisma.client.user.upsert({
      where: { telegramId },
      create: {
        telegramId,
        lastTelegramChatId: telegramId,
        username: payload.username,
        firstName: payload.first_name,
        lastName: payload.last_name,
        photoUrl: payload.photo_url
      },
      update: {
        lastTelegramChatId: telegramId,
        username: payload.username,
        firstName: payload.first_name,
        lastName: payload.last_name,
        photoUrl: payload.photo_url
      }
    });

    const coupleCode = await this.ensureUserCoupleCode(user.id);
    return this.buildAuthPayload({
      id: user.id,
      telegramId: user.telegramId,
      username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        isAdmin: user.isAdmin,
        isDark: user.isDark,
        coupleCode,
        email: user.email,
        hasPassword: Boolean(user.passwordHash)
    });
  }

  async registerWithPassword(payload: PasswordRegisterDto) {
    const normalizedEmail = this.normalizeEmail(payload.email);
    const existingUser = await this.prisma.client.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true }
    });

    if (existingUser) {
      throw new ConflictException("Account already exists for this email. Please sign in.");
    }

    const passwordHash = await this.hashPassword(payload.password);

    for (let attempt = 0; attempt < 12; attempt += 1) {
      try {
        const created = await this.prisma.client.user.create({
          data: {
            telegramId: this.generateWebsiteTelegramIdCandidate(),
            email: normalizedEmail,
            passwordHash,
            passwordSetAt: new Date(),
            firstName: payload.firstName?.trim() || null
          },
          select: {
            id: true,
            telegramId: true,
            username: true,
            firstName: true,
            lastName: true,
            isAdmin: true,
            isDark: true,
            coupleCode: true,
            email: true,
            passwordHash: true
          }
        });

        const coupleCode = created.coupleCode ?? (await this.ensureUserCoupleCode(created.id));

        return this.buildAuthPayload({
          id: created.id,
          telegramId: created.telegramId,
          username: created.username,
          firstName: created.firstName,
          lastName: created.lastName,
          isAdmin: created.isAdmin,
          isDark: created.isDark,
          coupleCode,
          email: created.email,
          hasPassword: Boolean(created.passwordHash)
        });
      } catch (error) {
        if (attempt === 11) {
          throw error;
        }
      }
    }

    throw new BadRequestException("Could not create account right now");
  }

  async loginFromBotWebApp(payload: BotWebAppLoginDto, authorizationHeader?: string) {
    if (!this.verifyBotWebAppSignature(payload)) {
      throw new UnauthorizedException("Bot web app signature is invalid or expired");
    }

    const telegramId = BigInt(payload.telegramId);
    const chatId = payload.chatId ? BigInt(payload.chatId) : telegramId;

    const authorizedUserId = this.resolveAuthorizedUserId(authorizationHeader);

    if (authorizedUserId) {
      const existingByTelegramId = await this.prisma.client.user.findUnique({
        where: { telegramId },
        select: { id: true }
      });

      if (existingByTelegramId && existingByTelegramId.id !== authorizedUserId) {
        throw new ConflictException("This Telegram account is already linked to another user");
      }

      const linkedUser = await this.prisma.client.user.update({
        where: { id: authorizedUserId },
        data: {
          telegramId,
          lastTelegramChatId: chatId
        }
      });

      const coupleCode = await this.ensureUserCoupleCode(linkedUser.id);
      return this.buildAuthPayload({
        id: linkedUser.id,
        telegramId: linkedUser.telegramId,
        username: linkedUser.username,
        firstName: linkedUser.firstName,
        lastName: linkedUser.lastName,
        isAdmin: linkedUser.isAdmin,
        isDark: linkedUser.isDark,
        coupleCode,
        email: linkedUser.email,
        hasPassword: Boolean(linkedUser.passwordHash)
      });
    }

    const user = await this.prisma.client.user.upsert({
      where: { telegramId },
      create: {
        telegramId,
        lastTelegramChatId: chatId,
        username: `tg_${payload.telegramId}`,
        firstName: "Duet"
      },
      update: {
        lastTelegramChatId: chatId
      }
    });

    const coupleCode = await this.ensureUserCoupleCode(user.id);
    return this.buildAuthPayload({
      id: user.id,
      telegramId: user.telegramId,
      username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        isAdmin: user.isAdmin,
        isDark: user.isDark,
        coupleCode,
        email: user.email,
        hasPassword: Boolean(user.passwordHash)
    });
  }

  async loginWithPassword(payload: PasswordLoginDto) {
    const normalizedEmail = this.normalizeEmail(payload.email);

    const user = await this.prisma.client.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        telegramId: true,
        username: true,
        firstName: true,
        lastName: true,
        isAdmin: true,
        isDark: true,
        coupleCode: true,
        email: true,
        passwordHash: true
      }
    });

    if (!user) {
      throw new NotFoundException("Account was not found. Please create account.");
    }

    if (!user.passwordHash) {
      throw new UnauthorizedException("This account does not have a website password yet.");
    }

    const validPassword = await this.verifyPassword(payload.password, user.passwordHash);

    if (!validPassword) {
      throw new UnauthorizedException("Password is incorrect");
    }

    const coupleCode = user.coupleCode ?? (await this.ensureUserCoupleCode(user.id));

    return this.buildAuthPayload({
      id: user.id,
      telegramId: user.telegramId,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      isAdmin: user.isAdmin,
      isDark: user.isDark,
      coupleCode,
      email: user.email,
      hasPassword: true
    });
  }

  async setupPassword(userId: string, payload: PasswordSetupDto) {
    const normalizedEmail = this.normalizeEmail(payload.email);

    const [currentUser, existingEmail] = await Promise.all([
      this.prisma.client.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          telegramId: true,
          username: true,
          firstName: true,
          lastName: true,
          isAdmin: true,
          isDark: true,
          coupleCode: true,
          email: true,
          passwordHash: true
        }
      }),
      this.prisma.client.user.findUnique({
        where: { email: normalizedEmail },
        select: {
          id: true
        }
      })
    ]);

    if (!currentUser) {
      throw new UnauthorizedException("User not found");
    }

    if (existingEmail && existingEmail.id !== currentUser.id) {
      throw new ConflictException("Email is already in use");
    }

    if (currentUser.passwordHash) {
      throw new BadRequestException("Password is already configured");
    }

    const passwordHash = await this.hashPassword(payload.password);
    const updated = await this.prisma.client.user.update({
      where: { id: currentUser.id },
      data: {
        email: normalizedEmail,
        passwordHash,
        passwordSetAt: new Date()
      },
      select: {
        id: true,
        telegramId: true,
        username: true,
        firstName: true,
        lastName: true,
        isAdmin: true,
        isDark: true,
        coupleCode: true,
        email: true,
        passwordHash: true
      }
    });

    const coupleCode = updated.coupleCode ?? (await this.ensureUserCoupleCode(updated.id));

    return this.buildAuthPayload({
      id: updated.id,
      telegramId: updated.telegramId,
      username: updated.username,
      firstName: updated.firstName,
      lastName: updated.lastName,
      isAdmin: updated.isAdmin,
      isDark: updated.isDark,
      coupleCode,
      email: updated.email,
      hasPassword: Boolean(updated.passwordHash)
    });
  }

  async me(userId: string) {
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
        isAdmin: true,
        isDark: true
      }
    });

    if (!user) {
      throw new UnauthorizedException("Invalid token");
    }

    return {
      id: user.id,
      telegramId: user.telegramId,
      lastTelegramChatId: user.lastTelegramChatId,
      email: user.email,
      passwordSetAt: user.passwordSetAt,
      hasPassword: Boolean(user.passwordHash),
      coupleCode: user.coupleCode,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      isAdmin: user.isAdmin,
      isDark: user.isDark
    };
  }

  async setThemePreference(userId: string, isDark: boolean) {
    const existingUser = await this.prisma.client.user.findUnique({
      where: { id: userId },
      select: { id: true }
    });

    if (!existingUser) {
      throw new UnauthorizedException("Invalid token");
    }

    const user = await this.prisma.client.user.update({
      where: { id: userId },
      data: { isDark },
      select: {
        isDark: true
      }
    });

    return user;
  }
}
