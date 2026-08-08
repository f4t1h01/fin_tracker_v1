import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { adminRateLimitMetadataKey, type AdminRateLimitOptions } from "./admin-rate-limit.decorator";
import { AdminRateLimitService } from "./admin-rate-limit.service";
import { readAdminSessionCookie, verifyAdminSessionToken } from "./admin-session.util";

const defaultAdminRateLimit: AdminRateLimitOptions = {
  max: 120,
  windowMs: 60_000,
  scope: "admin"
};

@Injectable()
export class AdminRateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rateLimitService: AdminRateLimitService
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const options =
      this.reflector.getAllAndOverride<AdminRateLimitOptions | undefined>(adminRateLimitMetadataKey, [
        context.getHandler(),
        context.getClass()
      ]) ?? defaultAdminRateLimit;

    const request = context.switchToHttp().getRequest();
    const ip = typeof request.ip === "string" && request.ip ? request.ip : "unknown";
    const scope = options.scope ?? request.routerPath ?? request.url ?? "admin";

    // This guard is controller-scoped, so it runs before AdminSessionGuard and
    // request.admin is not populated yet. Read the identity straight from the
    // signed cookie (signature only, no DB round trip) so the per-admin bucket
    // is real instead of always collapsing to "anonymous".
    const claims = verifyAdminSessionToken(readAdminSessionCookie(request));
    const adminEmail = claims?.email ?? "anonymous";

    this.rateLimitService.check(`${scope}:ip:${ip}`, options.max, options.windowMs);
    this.rateLimitService.check(`${scope}:admin:${adminEmail}`, options.max, options.windowMs);
    return true;
  }
}
