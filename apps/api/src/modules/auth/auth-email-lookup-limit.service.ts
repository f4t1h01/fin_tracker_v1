import { HttpException, HttpStatus, Injectable } from "@nestjs/common";

type LookupBucket = {
  missingAttempts: number;
  lockedUntil: number;
};

export type MissingEmailLookupResult = {
  attemptsRemaining: number;
  retryAfterSeconds?: number;
};

const MISSING_ATTEMPTS_PER_BATCH = 3;

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

  recordMissingEmail(key: string): MissingEmailLookupResult {
    const now = this.nowMs();
    const current = this.buckets.get(key) ?? {
      missingAttempts: 0,
      lockedUntil: 0
    };

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
      lockedUntil
    });

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
