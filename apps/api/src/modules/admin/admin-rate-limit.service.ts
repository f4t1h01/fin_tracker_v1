import { Injectable } from "@nestjs/common";

import { RateLimitService } from "../common/rate-limit.service";

/**
 * Thin wrapper kept so admin call sites stay unchanged. The bucket store,
 * eviction and 429 shaping all live in the shared RateLimitService now.
 */
@Injectable()
export class AdminRateLimitService {
  constructor(private readonly rateLimit: RateLimitService) {}

  check(key: string, max: number, windowMs: number) {
    this.rateLimit.check(key, max, windowMs, "Rate limit exceeded. Try again later.");
  }
}
