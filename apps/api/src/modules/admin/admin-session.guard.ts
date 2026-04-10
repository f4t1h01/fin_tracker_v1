import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { parseApiEnv } from "@repo/config";
import { verify } from "jsonwebtoken";

import { parseCookieHeader } from "./admin-cookie.util";
import { adminSessionCookieName } from "./admin-session.constants";

@Injectable()
export class AdminSessionGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const cookieHeader = request.headers.cookie;
    const cookies = parseCookieHeader(typeof cookieHeader === "string" ? cookieHeader : undefined);
    const token = cookies[adminSessionCookieName];

    if (!token) {
      throw new UnauthorizedException("Missing admin session");
    }

    const env = parseApiEnv(process.env);

    try {
      const payload = verify(token, env.API_JWT_SECRET) as {
        sub?: string;
        type?: string;
      };

      if (payload.type !== "admin" || typeof payload.sub !== "string" || !payload.sub) {
        throw new UnauthorizedException("Invalid admin session");
      }

      request.admin = {
        email: payload.sub
      };

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException("Invalid admin session");
    }
  }
}
