import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";
import {
  formatCurrencyRatesLog,
  getLatestCurrencyRatesSnapshot,
  isCurrencyRateRecord,
  primeCurrencyRatesFromStore,
  setCurrencyRateStore,
  type CurrencyRateSnapshot
} from "./currency";

const TASHKENT_OFFSET_HOURS = 5;
const REFRESH_HOURS = [10, 19] as const;
const SNAPSHOT_ID = "default";

@Injectable()
export class CurrencyRatesService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CurrencyRatesService.name);
  private refreshTimer: NodeJS.Timeout | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    // Give the rate cache a durable backing store before anything can ask for rates.
    setCurrencyRateStore({
      load: () => this.loadSnapshot(),
      save: (snapshot) => this.saveSnapshot(snapshot)
    });

    await this.refreshRates("startup");
    this.scheduleNextRefresh();
  }

  onModuleDestroy() {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }

    setCurrencyRateStore(null);
  }

  private async loadSnapshot(): Promise<CurrencyRateSnapshot | null> {
    const row = await this.prisma.client.currencyRateSnapshot.findUnique({
      where: { id: SNAPSHOT_ID },
      select: { rates: true, fetchedAt: true }
    });

    if (!row || !isCurrencyRateRecord(row.rates)) {
      return null;
    }

    return {
      values: row.rates,
      fetchedAt: row.fetchedAt.toISOString()
    };
  }

  private async saveSnapshot(snapshot: CurrencyRateSnapshot) {
    const fetchedAt = new Date(snapshot.fetchedAt);
    await this.prisma.client.currencyRateSnapshot.upsert({
      where: { id: SNAPSHOT_ID },
      create: { id: SNAPSHOT_ID, rates: snapshot.values, fetchedAt },
      update: { rates: snapshot.values, fetchedAt }
    });
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
      const cache = await getLatestCurrencyRatesSnapshot({ forceRefresh: true });
      this.logger.log(
        `Central Bank currency rates refreshed (${reason})${cache.fetchedAt ? ` at ${cache.fetchedAt}` : ""}: ${formatCurrencyRatesLog(cache.values)}`
      );
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown currency refresh error";
      this.logger.error(`Central Bank currency refresh failed during ${reason}: ${message}`);
    }

    // Warm the in-memory cache from the last persisted snapshot so transaction
    // writes still work while the upstream is down.
    try {
      const stored = await primeCurrencyRatesFromStore();
      if (stored) {
        this.logger.warn(`Serving persisted currency rates from ${stored.fetchedAt} until the upstream recovers`);
      } else {
        this.logger.error("No persisted currency rates available; currency-dependent writes will fail until a refresh succeeds");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown snapshot load error";
      this.logger.error(`Could not load persisted currency rates: ${message}`);
    }
  }
}
