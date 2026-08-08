import { HttpException, HttpStatus, Injectable } from "@nestjs/common";

type LookupBucket = {
  missingAttempts: number;
  lockedUntil: number;
  lastAttemptAt: number;
};

export type MissingEmailLookupResult = {
  attemptsRemaining: number;
  retryAfterSeconds?: number;
};

const MISSING_ATTEMPTS_PER_BATCH = 3;
/** Idle window after which a caller's escalation history is forgiven. */
const DECAY_AFTER_MS = 30 * 60_000;
const MAX_BUCKETS = 50_000;

@Injectable()
export class AuthEmailLookupLimitService {
  private readonly buckets = new Map<string, LookupBucket>();

  protected nowMs() {
    return Date.now();
  }

  buildKey(meta?: { ip?: string | null; userAgent?: string | null }) {
    const ip = meta?.ip?.trim() || "unknown";
    return ip;
  }

  private sweep(now: number) {
    for (const [key, bucket] of this.buckets) {
      if (bucket.lockedUntil <= now && now - bucket.lastAttemptAt > DECAY_AFTER_MS) {
        this.buckets.delete(key);
      }
    }
  }

  recordMissingEmail(key: string): MissingEmailLookupResult {
    const now = this.nowMs();
    const stored = this.buckets.get(key);

    // Escalation used to be permanent for a key, which meant one burst locked
    // that caller into the longest delay forever. Forgive it after an idle gap.
    const current =
      stored && now - stored.lastAttemptAt <= DECAY_AFTER_MS
        ? stored
        : { missingAttempts: 0, lockedUntil: stored?.lockedUntil ?? 0, lastAttemptAt: now };

    if (current.lockedUntil > now) {
      this.throwLocked(current.lockedUntil, now);
    }

    const missingAttempts = current.missingAttempts + 1;
    const attemptsIntoBatch = missingAttempts % MISSING_ATTEMPTS_PER_BATCH;
    const attemptsRemaining = attemptsIntoBatch === 0 ? 0 : MISSING_ATTEMPTS_PER_BATCH - attemptsIntoBatch;
    const completedBatches = Math.floor(missingAttempts / MISSING_ATTEMPTS_PER_BATCH);
    const retryAfterSeconds = attemptsRemaining === 0 ? this.delayForCompletedBatch(completedBatches) : undefined;
    const lockedUntil = retryAfterSeconds ? now + retryAfterSeconds * 1000 : 0;

    this.buckets.set(key, {
      missingAttempts,
      lockedUntil,
      lastAttemptAt: now
    });

    if (this.buckets.size > MAX_BUCKETS) {
      this.sweep(now);
    }

    return {
      attemptsRemaining,
      ...(retryAfterSeconds ? { retryAfterSeconds } : {})
    };
  }

  private delayForCompletedBatch(completedBatches: number) {
    if (completedBatches <= 1) {
      return 30;
    }

    if (completedBatches === 2) {
      return 60;
    }

    return 180;
  }

  private throwLocked(lockedUntil: number, now: number): never {
    const retryAfterSeconds = Math.max(1, Math.ceil((lockedUntil - now) / 1000));
    throw new HttpException(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message: "Too many email checks. Try again later.",
        retryAfterSeconds
      },
      HttpStatus.TOO_MANY_REQUESTS
    );
  }
}
