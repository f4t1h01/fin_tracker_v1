import { HttpException, HttpStatus, Injectable, OnModuleDestroy } from "@nestjs/common";

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

export type RateLimitDecision = {
  limit: number;
  remaining: number;
  resetAt: number;
};

/**
 * Fixed-window in-process rate limiter.
 *
 * Intentionally simple, with two properties the previous ad-hoc maps lacked:
 * expired buckets are swept so the map cannot grow without bound, and the map is
 * hard-capped so a flood of distinct keys cannot exhaust memory.
 *
 * This is per-process state: it does not survive a restart and does not
 * coordinate across replicas. Move to a shared store before scaling out.
 */
@Injectable()
export class RateLimitService implements OnModuleDestroy {
  private readonly buckets = new Map<string, RateLimitBucket>();
  private readonly maxBuckets = 50_000;
  private readonly sweepIntervalMs = 60_000;
  private sweepTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.sweepTimer = setInterval(() => this.sweep(), this.sweepIntervalMs);
    // Never keep the event loop alive just for housekeeping.
    this.sweepTimer.unref?.();
  }

  onModuleDestroy() {
    if (this.sweepTimer) {
      clearInterval(this.sweepTimer);
      this.sweepTimer = null;
    }
  }

  private sweep() {
    const now = Date.now();
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) {
        this.buckets.delete(key);
      }
    }
  }

  private enforceCapacity() {
    if (this.buckets.size <= this.maxBuckets) {
      return;
    }

    this.sweep();

    // Map iteration order is insertion order, so the first entries are the
    // oldest windows. Drop them until we are back under the cap.
    while (this.buckets.size > this.maxBuckets) {
      const oldestKey = this.buckets.keys().next().value;
      if (oldestKey === undefined) {
        break;
      }

      this.buckets.delete(oldestKey);
    }
  }

  /** Consumes one unit. Returns the remaining allowance, or null when over budget. */
  consume(key: string, max: number, windowMs: number): RateLimitDecision | null {
    const now = Date.now();
    const current = this.buckets.get(key);

    if (!current || current.resetAt <= now) {
      const resetAt = now + windowMs;
      this.buckets.set(key, { count: 1, resetAt });
      this.enforceCapacity();
      return { limit: max, remaining: Math.max(0, max - 1), resetAt };
    }

    if (current.count >= max) {
      return null;
    }

    current.count += 1;
    return { limit: max, remaining: Math.max(0, max - current.count), resetAt: current.resetAt };
  }

  /** Consumes one unit and throws 429 when over budget. */
  check(key: string, max: number, windowMs: number, message = "Too many requests. Try again later.") {
    const decision = this.consume(key, max, windowMs);
    if (decision) {
      return decision;
    }

    const bucket = this.buckets.get(key);
    const retryAfterSeconds = bucket ? Math.max(1, Math.ceil((bucket.resetAt - Date.now()) / 1000)) : 1;

    throw new HttpException(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message,
        retryAfterSeconds
      },
      HttpStatus.TOO_MANY_REQUESTS
    );
  }

  /** Clears a key, e.g. after a successful login so a user is not punished for typos. */
  reset(key: string) {
    this.buckets.delete(key);
  }
}
