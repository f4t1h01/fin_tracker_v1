import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { parseApiEnv } from "@repo/config";
import { verify } from "jsonwebtoken";

@Injectable()
export class AdminJwtGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader: string | undefined = request.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Missing bearer token");
    }

    const token = authHeader.replace("Bearer ", "").trim();
    const env = parseApiEnv(process.env);

    try {
      const payload = verify(token, env.API_JWT_SECRET) as {
        sub?: string;
        type?: string;
      };

      if (payload.type !== "admin" || typeof payload.sub !== "string" || !payload.sub) {
        throw new UnauthorizedException("Invalid admin token");
      }

      request.admin = {
        email: payload.sub
      };

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException("Invalid admin token");
    }
  }
}
