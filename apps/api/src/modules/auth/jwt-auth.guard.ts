import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { parseApiEnv } from "@repo/config";
import { verify } from "jsonwebtoken";

@Injectable()
export class JwtAuthGuard implements CanActivate {
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
        sub: string;
        telegramId: string;
      };

      request.user = {
        id: payload.sub,
        telegramId: payload.telegramId
      };

      return true;
    } catch {
      throw new UnauthorizedException("Invalid token");
    }
  }
}
