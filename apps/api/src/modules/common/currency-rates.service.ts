import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";

import { formatCurrencyRatesLog, getCachedCurrencyRates, getLatestCurrencyRates } from "./currency";

const TASHKENT_OFFSET_HOURS = 5;
const REFRESH_HOURS = [10, 19] as const;

@Injectable()
export class CurrencyRatesService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CurrencyRatesService.name);
  private refreshTimer: NodeJS.Timeout | null = null;

  async onModuleInit() {
    await this.refreshRates("startup");
    this.scheduleNextRefresh();
  }

  onModuleDestroy() {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  private getNextRefreshDelayMs(from: Date) {
    const tashkentNowMs = from.getTime() + TASHKENT_OFFSET_HOURS * 60 * 60 * 1000;
    const tashkentNow = new Date(tashkentNowMs);

    for (const hour of REFRESH_HOURS) {
      const candidateTashkent = new Date(
        Date.UTC(
          tashkentNow.getUTCFullYear(),
          tashkentNow.getUTCMonth(),
          tashkentNow.getUTCDate(),
          hour,
          0,
          0,
          0
        )
      );

      const candidateUtcMs = candidateTashkent.getTime() - TASHKENT_OFFSET_HOURS * 60 * 60 * 1000;
      if (candidateUtcMs > from.getTime()) {
        return candidateUtcMs - from.getTime();
      }
    }

    const nextDayTashkent = new Date(
      Date.UTC(
        tashkentNow.getUTCFullYear(),
        tashkentNow.getUTCMonth(),
        tashkentNow.getUTCDate() + 1,
        REFRESH_HOURS[0],
        0,
        0,
        0
      )
    );

    const nextDayUtcMs = nextDayTashkent.getTime() - TASHKENT_OFFSET_HOURS * 60 * 60 * 1000;
    return nextDayUtcMs - from.getTime();
  }

  private scheduleNextRefresh() {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    const delayMs = this.getNextRefreshDelayMs(new Date());
    this.refreshTimer = setTimeout(async () => {
      await this.refreshRates("scheduled");
      this.scheduleNextRefresh();
    }, delayMs);

    const nextRun = new Date(Date.now() + delayMs).toISOString();
    this.logger.log(`Next Central Bank currency refresh scheduled for ${nextRun} UTC`);
  }

  private async refreshRates(reason: "startup" | "scheduled") {
    try {
      const rates = await getLatestCurrencyRates({ forceRefresh: true });
      const cache = getCachedCurrencyRates();
      this.logger.log(
        `Central Bank currency rates refreshed (${reason})${cache?.fetchedAt ? ` at ${cache.fetchedAt}` : ""}: ${formatCurrencyRatesLog(rates)}`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown currency refresh error";
      this.logger.error(`Central Bank currency refresh failed during ${reason}: ${message}`);
    }
  }
}
