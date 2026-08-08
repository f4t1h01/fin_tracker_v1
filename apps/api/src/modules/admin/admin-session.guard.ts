import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";
import { readAdminSessionCookie, verifyAdminSessionToken } from "./admin-session.util";

@Injectable()
export class AdminSessionGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = readAdminSessionCookie(request);

    if (!token) {
      throw new UnauthorizedException("Missing admin session");
    }

    const claims = verifyAdminSessionToken(token);
    if (!claims) {
      throw new UnauthorizedException("Invalid admin session");
    }

    // A valid signature is not enough: deactivating an admin or resetting their
    // password must end live sessions immediately, so account state is
    // re-checked on every request.
    const admin = await this.prisma.client.zeroAdmin.findUnique({
      where: { email: claims.email },
      select: { isActive: true, tokenVersion: true }
    });

    if (!admin || !admin.isActive || admin.tokenVersion !== claims.tokenVersion) {
      throw new UnauthorizedException("Admin session is no longer valid");
    }

    request.admin = {
      email: claims.email
    };

    return true;
  }
}
