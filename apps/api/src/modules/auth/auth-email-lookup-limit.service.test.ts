import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { HttpException, HttpStatus } from "@nestjs/common";

import { AuthEmailLookupLimitService } from "./auth-email-lookup-limit.service";

class TestLookupLimitService extends AuthEmailLookupLimitService {
  private currentNow = 1_000_000;

  advance(ms: number) {
    this.currentNow += ms;
  }

  protected override nowMs() {
    return this.currentNow;
  }
}

describe("auth email lookup limit", () => {
  it("locks missing email lookup batches at 30s, 60s, then 180s", () => {
    const service = new TestLookupLimitService();
    const key = "127.0.0.1:test";

    assert.deepEqual(service.recordMissingEmail(key), { attemptsRemaining: 2 });
    assert.deepEqual(service.recordMissingEmail(key), { attemptsRemaining: 1 });
    assert.deepEqual(service.recordMissingEmail(key), { attemptsRemaining: 0, retryAfterSeconds: 30 });
    assertLockedFor(service, key, 30);

    service.advance(30_000);
    assert.deepEqual(service.recordMissingEmail(key), { attemptsRemaining: 2 });
    assert.deepEqual(service.recordMissingEmail(key), { attemptsRemaining: 1 });
    assert.deepEqual(service.recordMissingEmail(key), { attemptsRemaining: 0, retryAfterSeconds: 60 });
    assertLockedFor(service, key, 60);

    service.advance(60_000);
    assert.deepEqual(service.recordMissingEmail(key), { attemptsRemaining: 2 });
    assert.deepEqual(service.recordMissingEmail(key), { attemptsRemaining: 1 });
    assert.deepEqual(service.recordMissingEmail(key), { attemptsRemaining: 0, retryAfterSeconds: 180 });
    assertLockedFor(service, key, 180);

    service.advance(180_000);
    assert.deepEqual(service.recordMissingEmail(key), { attemptsRemaining: 2 });
    assert.deepEqual(service.recordMissingEmail(key), { attemptsRemaining: 1 });
    assert.deepEqual(service.recordMissingEmail(key), { attemptsRemaining: 0, retryAfterSeconds: 180 });
    assertLockedFor(service, key, 180);
  });
});

function assertLockedFor(service: AuthEmailLookupLimitService, key: string, expectedRetryAfterSeconds: number) {
  assert.throws(
    () => service.recordMissingEmail(key),
    (error) => {
      assert.ok(error instanceof HttpException);
      assert.equal(error.getStatus(), HttpStatus.TOO_MANY_REQUESTS);
      assert.deepEqual(error.getResponse(), {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message: "Too many email checks. Try again later.",
        retryAfterSeconds: expectedRetryAfterSeconds
      });
      return true;
    }
  );
}
