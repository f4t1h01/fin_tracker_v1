import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { parseApiEnv } from "@repo/config";
import { sign, verify } from "jsonwebtoken";
import { createHash, createHmac, randomBytes, randomInt, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

import { generateCoupleCodeCandidate } from "../common/couple-code";
import { EmailDeliveryService } from "../common/email-delivery.service";
import { SecretBoxService } from "../common/secret-box.service";
import { PrismaService } from "../prisma/prisma.service";
import { BotWebAppLoginDto } from "./dto/bot-webapp-login.dto";
import { EmailCodeLoginDto } from "./dto/email-code-login.dto";
import { EmailCodeRequestDto } from "./dto/email-code-request.dto";
import { PasswordChangeDto } from "./dto/password-change.dto";
import { PasswordLoginDto } from "./dto/password-login.dto";
import { PasswordRegisterDto } from "./dto/password-register.dto";
import { PasswordResetConfirmDto } from "./dto/password-reset-confirm.dto";
import { PasswordSetupDto } from "./dto/password-setup.dto";
import { TelegramLoginDto } from "./dto/telegram-login.dto";
import { createTelegramLinkToken as createTelegramLinkTokenValue, resolveTelegramLinkToken } from "./telegram-link-token";

const scryptAsync = promisify(scrypt);
const EMAIL_CODE_TTL_MINUTES = 15;
const EMAIL_CODE_MAX_ATTEMPTS = 5;
const EMAIL_CODE_MAX_REQUESTS_PER_15_MINUTES = 5;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailDelivery: EmailDeliveryService,
    private readonly secretBox: SecretBoxService
  ) {}

  private get db(): any {
    return this.prisma.client as any;
  }

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

  private generateEmailCode() {
    return randomInt(0, 1_000_000).toString().padStart(6, "0");
  }

  private hashEmailCode(email: string, purpose: "LOGIN" | "PASSWORD_RESET", code: string) {
    return this.secretBox.hmac(`${purpose}:${email}:${code}`, "email-code");
  }

  private emailCodeMatches(actualHash: string, expectedHash: string) {
    const actual = Buffer.from(actualHash, "hex");
    const expected = Buffer.from(expectedHash, "hex");
    return actual.length === expected.length && expected.length > 0 && timingSafeEqual(actual, expected);
  }

  private async createAndSendEmailCode(email: string, purpose: "LOGIN" | "PASSWORD_RESET", requestMeta?: { ip?: string | null; userAgent?: string | null }) {
    const normalizedEmail = this.normalizeEmail(email);
    const windowStart = new Date(Date.now() - 15 * 60_000);
    const recentRequests = await this.db.authEmailCode.count({
      where: {
        email: normalizedEmail,
        purpose,
        createdAt: {
          gte: windowStart
        }
      }
    });

    if (recentRequests >= EMAIL_CODE_MAX_REQUESTS_PER_15_MINUTES) {
      throw new BadRequestException("Too many code requests. Try again later.");
    }

    const code = this.generateEmailCode();
    const now = new Date();
    await this.db.$transaction(async (tx: any) => {
      await tx.authEmailCode.updateMany({
        where: {
          email: normalizedEmail,
          purpose,
          consumedAt: null
        },
        data: {
          consumedAt: now
        }
      });

      await tx.authEmailCode.create({
        data: {
          email: normalizedEmail,
          purpose,
          codeHash: this.hashEmailCode(normalizedEmail, purpose, code),
          expiresAt: new Date(Date.now() + EMAIL_CODE_TTL_MINUTES * 60_000),
          requestIp: requestMeta?.ip ?? null,
          userAgent: requestMeta?.userAgent ?? null
        }
      });
    });

    const label = purpose === "PASSWORD_RESET" ? "password reset" : "sign-in";
    await this.emailDelivery.send({
      to: normalizedEmail,
      subject: `Your CupFin ${label} code`,
      text: `Your CupFin ${label} code is ${code}. It expires in ${EMAIL_CODE_TTL_MINUTES} minutes.`,
      html: `<p>Your CupFin ${label} code is <strong>${code}</strong>.</p><p>It expires in ${EMAIL_CODE_TTL_MINUTES} minutes.</p>`
    });
  }

  private async consumeEmailCode(email: string, purpose: "LOGIN" | "PASSWORD_RESET", code: string) {
    const normalizedEmail = this.normalizeEmail(email);
    const now = new Date();
    const record = await this.db.authEmailCode.findFirst({
      where: {
        email: normalizedEmail,
        purpose,
        consumedAt: null,
        expiresAt: {
          gt: now
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    if (!record) {
      throw new UnauthorizedException("Code is invalid or expired");
    }

    if (record.attempts >= EMAIL_CODE_MAX_ATTEMPTS) {
      await this.db.authEmailCode.update({
        where: { id: record.id },
        data: { consumedAt: now }
      });
      throw new UnauthorizedException("Code is invalid or expired");
    }

    const expectedHash = this.hashEmailCode(normalizedEmail, purpose, code);
    if (!this.emailCodeMatches(record.codeHash, expectedHash)) {
      await this.db.authEmailCode.update({
        where: { id: record.id },
        data: {
          attempts: {
            increment: 1
          }
        }
      });
      throw new UnauthorizedException("Code is invalid or expired");
    }

    await this.db.authEmailCode.update({
      where: { id: record.id },
      data: {
        consumedAt: now
      }
    });
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

  private async resolveTelegramLinkUserId(linkToken?: string): Promise<string | null> {
    if (!linkToken) {
      return null;
    }

    const env = parseApiEnv(process.env);
    const parsed = resolveTelegramLinkToken(linkToken, env.API_JWT_SECRET);
    if (!parsed) {
      return null;
    }

    const user = await this.prisma.client.user.findUnique({
      where: { id: parsed.userId },
      select: { id: true }
    });

    return user?.id ?? null;
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

  private parseTelegramWebAppInitData(initData: string) {
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    const authDate = params.get("auth_date");
    const userRaw = params.get("user");
    const receiverRaw = params.get("receiver");
    const chatRaw = params.get("chat");

    if (!hash || !authDate || !userRaw) {
      throw new UnauthorizedException("Telegram WebApp payload is incomplete");
    }

    const entries = [...params.entries()]
      .filter(([key]) => key !== "hash")
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join("\n");

    const env = parseApiEnv(process.env);
    const secret = createHmac("sha256", "WebAppData").update(env.TELEGRAM_BOT_TOKEN).digest();
    const digest = createHmac("sha256", secret).update(entries).digest();
    const incomingHash = Buffer.from(hash, "hex");

    if (incomingHash.length !== digest.length || !timingSafeEqual(digest, incomingHash)) {
      throw new UnauthorizedException("Telegram WebApp payload is invalid");
    }

    const authTimestamp = Number(authDate);
    const now = Math.floor(Date.now() / 1000);
    if (!Number.isFinite(authTimestamp) || Math.abs(now - authTimestamp) > 600) {
      throw new UnauthorizedException("Telegram WebApp payload expired");
    }

    const user = JSON.parse(userRaw) as {
      id: number;
      first_name?: string;
      last_name?: string;
      username?: string;
      photo_url?: string;
    };
    const receiver = receiverRaw ? (JSON.parse(receiverRaw) as { id?: number }) : null;
    const chat = chatRaw ? (JSON.parse(chatRaw) as { id?: number }) : null;

    const chatId = chat?.id ?? receiver?.id ?? user.id;

    return {
      telegramId: BigInt(user.id),
      chatId: BigInt(chatId),
      startParam: params.get("start_param") ?? null,
      username: user.username ?? null,
      firstName: user.first_name ?? null,
      lastName: user.last_name ?? null,
      photoUrl: user.photo_url ?? null
    };
  }

  async createTelegramLinkToken(userId: string) {
    const existingUser = await this.prisma.client.user.findUnique({
      where: { id: userId },
      select: { id: true }
    });

    if (!existingUser) {
      throw new UnauthorizedException("Invalid token");
    }

    const env = parseApiEnv(process.env);
    return {
      startParam: createTelegramLinkTokenValue(userId, env.API_JWT_SECRET)
    };
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

    const authorizedUserId = this.resolveAuthorizedUserId(authorizationHeader) ?? (await this.resolveTelegramLinkUserId(payload.linkToken));

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

  async loginFromTelegramWebApp(initData: string, authorizationHeader?: string, linkToken?: string) {
    const parsed = this.parseTelegramWebAppInitData(initData);
    const authorizedUserId = this.resolveAuthorizedUserId(authorizationHeader) ?? (await this.resolveTelegramLinkUserId(linkToken ?? parsed.startParam ?? undefined));

    if (authorizedUserId) {
      const existingByTelegramId = await this.prisma.client.user.findUnique({
        where: { telegramId: parsed.telegramId },
        select: { id: true }
      });

      if (existingByTelegramId && existingByTelegramId.id !== authorizedUserId) {
        throw new ConflictException("This Telegram account is already linked to another user");
      }

      const linkedUser = await this.prisma.client.user.update({
        where: { id: authorizedUserId },
        data: {
          telegramId: parsed.telegramId,
          lastTelegramChatId: parsed.chatId,
          username: parsed.username,
          firstName: parsed.firstName,
          lastName: parsed.lastName,
          photoUrl: parsed.photoUrl
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
      where: { telegramId: parsed.telegramId },
      create: {
        telegramId: parsed.telegramId,
        lastTelegramChatId: parsed.chatId,
        username: parsed.username,
        firstName: parsed.firstName,
        lastName: parsed.lastName,
        photoUrl: parsed.photoUrl
      },
      update: {
        lastTelegramChatId: parsed.chatId,
        username: parsed.username,
        firstName: parsed.firstName,
        lastName: parsed.lastName,
        photoUrl: parsed.photoUrl
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

  async requestEmailLoginCode(payload: EmailCodeRequestDto, requestMeta?: { ip?: string | null; userAgent?: string | null }) {
    const emailStatus = await this.emailDelivery.getPublicStatus();
    if (!emailStatus.emailCodeEnabled) {
      throw new BadRequestException("Email code login is not configured yet");
    }

    const normalizedEmail = this.normalizeEmail(payload.email);
    const user = await this.db.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true
      }
    });

    if (user) {
      await this.createAndSendEmailCode(normalizedEmail, "LOGIN", requestMeta);
    }

    return {
      ok: true,
      message: "If this email exists, a sign-in code was sent."
    };
  }

  async loginWithEmailCode(payload: EmailCodeLoginDto) {
    const normalizedEmail = this.normalizeEmail(payload.email);
    await this.consumeEmailCode(normalizedEmail, "LOGIN", payload.code);

    const user = await this.db.user.findUnique({
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
      throw new UnauthorizedException("Code is invalid or expired");
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
      hasPassword: Boolean(user.passwordHash)
    });
  }

  async requestPasswordResetCode(payload: EmailCodeRequestDto, requestMeta?: { ip?: string | null; userAgent?: string | null }) {
    const emailStatus = await this.emailDelivery.getPublicStatus();
    if (!emailStatus.emailCodeEnabled) {
      throw new BadRequestException("Email password reset is not configured yet");
    }

    const normalizedEmail = this.normalizeEmail(payload.email);
    const user = await this.db.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        passwordHash: true
      }
    });

    if (user?.passwordHash) {
      await this.createAndSendEmailCode(normalizedEmail, "PASSWORD_RESET", requestMeta);
    }

    return {
      ok: true,
      message: "If this email has a password login, a reset code was sent."
    };
  }

  async resetPasswordWithEmailCode(payload: PasswordResetConfirmDto) {
    const normalizedEmail = this.normalizeEmail(payload.email);
    await this.consumeEmailCode(normalizedEmail, "PASSWORD_RESET", payload.code);

    const user = await this.db.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true }
    });

    if (!user) {
      throw new UnauthorizedException("Code is invalid or expired");
    }

    const passwordHash = await this.hashPassword(payload.newPassword);
    await this.db.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordSetAt: new Date()
      }
    });

    return { ok: true };
  }

  async changePassword(userId: string, payload: PasswordChangeDto) {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        passwordHash: true
      }
    });

    if (!user?.passwordHash) {
      throw new BadRequestException("Password is not configured yet");
    }

    const validPassword = await this.verifyPassword(payload.currentPassword, user.passwordHash);
    if (!validPassword) {
      throw new UnauthorizedException("Current password is incorrect");
    }

    const passwordHash = await this.hashPassword(payload.newPassword);
    await this.db.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordSetAt: new Date()
      }
    });

    return { ok: true };
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
        photoUrl: true,
        telegramPhone: true,
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
      photoUrl: user.photoUrl,
      telegramPhone: user.telegramPhone,
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
