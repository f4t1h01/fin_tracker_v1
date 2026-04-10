import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { adminRateLimitMetadataKey, type AdminRateLimitOptions } from "./admin-rate-limit.decorator";
import { AdminRateLimitService } from "./admin-rate-limit.service";

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
    const ip = String(request.ip ?? request.headers["x-forwarded-for"] ?? "unknown");
    const adminEmail = typeof request.admin?.email === "string" ? request.admin.email : "anonymous";
    const scope = options.scope ?? request.routerPath ?? request.url ?? "admin";
    const key = `${scope}:${ip}:${adminEmail}`;

    this.rateLimitService.check(key, options.max, options.windowMs);
    return true;
  }
}
