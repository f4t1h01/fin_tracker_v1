import { Injectable, UnauthorizedException } from "@nestjs/common";
import { parseApiEnv } from "@repo/config";
import { sign } from "jsonwebtoken";
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

import { PrismaService } from "../prisma/prisma.service";
import { adminSessionTtlSeconds } from "./admin-session.constants";
import { AdminAuditService, type AdminRequestMeta } from "./admin-audit.service";

const scryptAsync = promisify(scrypt);

@Injectable()
export class AdminAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService
  ) {}

  private get db(): any {
    return this.prisma.client as any;
  }

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  private issueAccessToken(email: string) {
    const env = parseApiEnv(process.env);
    return sign({ sub: email, type: "admin" }, env.API_JWT_SECRET, {
      expiresIn: `${adminSessionTtlSeconds}s`
    });
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

  async hashPassword(password: string) {
    const salt = randomBytes(16);
    const derived = (await scryptAsync(password, salt, 64)) as Buffer;
    return `scrypt:${salt.toString("hex")}:${derived.toString("hex")}`;
  }

  async requireAdmin(email: string) {
    const admin = await this.db.zeroAdmin.findUnique({
      where: { email },
      select: {
        email: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true
      }
    });

    if (!admin || !admin.isActive) {
      throw new UnauthorizedException("Admin account not found");
    }

    return admin;
  }

  async login(email: string, password: string, requestMeta: AdminRequestMeta) {
    const normalizedEmail = this.normalizeEmail(email);
    const admin = await this.db.zeroAdmin.findUnique({
      where: { email: normalizedEmail },
      select: {
        email: true,
        passwordHash: true,
        isActive: true
      }
    });

    if (!admin) {
      await this.audit.log({
        adminEmail: normalizedEmail,
        actionType: "ADMIN_LOGIN",
        targetType: "ADMIN",
        targetId: normalizedEmail,
        requestMeta,
        outcome: "ERROR",
        errorMessage: "Invalid admin email or password"
      });
      throw new UnauthorizedException("Invalid admin email or password");
    }

    if (!admin.isActive) {
      await this.audit.log({
        adminEmail: normalizedEmail,
        actionType: "ADMIN_LOGIN",
        targetType: "ADMIN",
        targetId: normalizedEmail,
        requestMeta,
        outcome: "ERROR",
        errorMessage: "Admin account is inactive"
      });
      throw new UnauthorizedException("Admin account is inactive");
    }

    const validPassword = await this.verifyPassword(password, admin.passwordHash);
    if (!validPassword) {
      await this.audit.log({
        adminEmail: normalizedEmail,
        actionType: "ADMIN_LOGIN",
        targetType: "ADMIN",
        targetId: normalizedEmail,
        requestMeta,
        outcome: "ERROR",
        errorMessage: "Invalid admin email or password"
      });
      throw new UnauthorizedException("Invalid admin email or password");
    }

    await this.db.zeroAdmin.update({
      where: { email: normalizedEmail },
      data: {
        lastLoginAt: new Date()
      }
    });

    await this.audit.log({
      adminEmail: normalizedEmail,
      actionType: "ADMIN_LOGIN",
      targetType: "ADMIN",
      targetId: normalizedEmail,
      requestMeta,
      outcome: "SUCCESS"
    });

    return {
      accessToken: this.issueAccessToken(normalizedEmail),
      admin: {
        email: normalizedEmail
      }
    };
  }

  async logout(email: string, requestMeta: AdminRequestMeta) {
    await this.audit.log({
      adminEmail: email,
      actionType: "ADMIN_LOGOUT",
      targetType: "ADMIN",
      targetId: email,
      requestMeta,
      outcome: "SUCCESS"
    });

    return { ok: true };
  }
}
