import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { rateLimitMetadataKey, type RateLimitKeyFacet, type RateLimitOptions } from "./rate-limit.decorator";
import { RateLimitService } from "./rate-limit.service";

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rateLimitService: RateLimitService
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const options = this.reflector.getAllAndOverride<RateLimitOptions | undefined>(rateLimitMetadataKey, [
      context.getHandler(),
      context.getClass()
    ]);

    if (!options) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const facets = options.keys ?? ["ip"];

    for (const facet of facets) {
      const value = this.resolveFacet(facet, request);
      if (!value) {
        continue;
      }

      this.rateLimitService.check(
        `${options.scope}:${facet}:${value}`,
        options.max,
        options.windowMs,
        options.message
      );
    }

    return true;
  }

  private resolveFacet(facet: RateLimitKeyFacet, request: Record<string, any>) {
    if (facet === "ip") {
      // Requires Fastify trustProxy plus nginx real_ip, otherwise every caller
      // shares the proxy address and this degrades into a single global bucket.
      return typeof request.ip === "string" && request.ip ? request.ip : "unknown";
    }

    if (facet === "user") {
      const userId = request.user?.id;
      return typeof userId === "string" && userId ? userId : null;
    }

    const email = request.body?.email;
    return typeof email === "string" && email.trim() ? email.trim().toLowerCase() : null;
  }
}
