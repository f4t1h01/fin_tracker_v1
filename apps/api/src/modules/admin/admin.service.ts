import { Injectable, UnauthorizedException } from "@nestjs/common";
import { parseApiEnv } from "@repo/config";
import { sign } from "jsonwebtoken";
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

import { PrismaService } from "../prisma/prisma.service";

const scryptAsync = promisify(scrypt);

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  private issueAccessToken(email: string) {
    const env = parseApiEnv(process.env);
    return sign({ sub: email, type: "admin" }, env.API_JWT_SECRET, {
      expiresIn: "7d"
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

  async login(email: string, password: string) {
    const normalizedEmail = this.normalizeEmail(email);
    const admin = await this.prisma.client.zeroAdmin.findUnique({
      where: { email: normalizedEmail },
      select: {
        email: true,
        passwordHash: true
      }
    });

    if (!admin) {
      throw new UnauthorizedException("Invalid admin email or password");
    }

    const validPassword = await this.verifyPassword(password, admin.passwordHash);

    if (!validPassword) {
      throw new UnauthorizedException("Invalid admin email or password");
    }

    return {
      accessToken: this.issueAccessToken(admin.email),
      admin: {
        email: admin.email
      }
    };
  }

  async me(email: string) {
    const admin = await this.prisma.client.zeroAdmin.findUnique({
      where: { email },
      select: {
        email: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!admin) {
      throw new UnauthorizedException("Admin account not found");
    }

    return admin;
  }

  dashboardMetrics() {
    return this.prisma.client.$transaction([
      this.prisma.client.user.count(),
      this.prisma.client.couple.count(),
      this.prisma.client.transaction.count(),
      this.prisma.client.category.count()
    ]);
  }

  latestUsers() {
    return this.prisma.client.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        telegramId: true,
        username: true,
        firstName: true,
        lastName: true,
        createdAt: true,
        isAdmin: true
      }
    });
  }
}
