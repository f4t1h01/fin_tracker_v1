import { HttpException, HttpStatus, Injectable } from "@nestjs/common";

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

@Injectable()
export class AdminRateLimitService {
  private readonly buckets = new Map<string, RateLimitBucket>();

  check(key: string, max: number, windowMs: number) {
    const now = Date.now();
    const current = this.buckets.get(key);

    if (!current || current.resetAt <= now) {
      this.buckets.set(key, {
        count: 1,
        resetAt: now + windowMs
      });
      return;
    }

    if (current.count >= max) {
      const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
      throw new HttpException(`Rate limit exceeded. Retry in ${retryAfterSeconds}s.`, HttpStatus.TOO_MANY_REQUESTS);
    }

    current.count += 1;
  }
}
