import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { getApiEnv } from "@repo/config";
import { verify } from "jsonwebtoken";

import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader: string | undefined = request.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Missing bearer token");
    }

    const token = authHeader.slice("Bearer ".length).trim();
    if (!token) {
      throw new UnauthorizedException("Missing bearer token");
    }

    const env = getApiEnv();
    let payload: { sub?: unknown; telegramId?: unknown; tokenVersion?: unknown };

    try {
      payload = verify(token, env.API_JWT_SECRET) as typeof payload;
    } catch {
      throw new UnauthorizedException("Invalid token");
    }

    if (typeof payload.sub !== "string" || !payload.sub) {
      throw new UnauthorizedException("Invalid token");
    }

    // Tokens live for 7 days, so without this check a password change or reset
    // would leave a stolen token usable for the rest of its lifetime.
    const user = await this.prisma.client.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, tokenVersion: true }
    });

    if (!user) {
      throw new UnauthorizedException("Invalid token");
    }

    const tokenVersion = typeof payload.tokenVersion === "number" ? payload.tokenVersion : 0;
    if (user.tokenVersion !== tokenVersion) {
      throw new UnauthorizedException("Session expired. Please sign in again.");
    }

    request.user = {
      id: user.id,
      telegramId: typeof payload.telegramId === "string" ? payload.telegramId : null
    };

    return true;
  }
}
