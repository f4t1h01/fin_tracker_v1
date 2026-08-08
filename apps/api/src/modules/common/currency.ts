type CbuRateEntry = {
  Ccy: string;
  Nominal: string;
  Rate: string;
};

export const SUPPORTED_CURRENCIES = ["UZS", "USD", "EUR", "RUB", "GBP", "JPY", "CNY", "KZT", "TRY", "AED"] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

const SUPPORTED_CURRENCY_SET = new Set<string>(SUPPORTED_CURRENCIES);
export const CBU_RATES_URL = "https://cbu.uz/uz/arkhiv-kursov-valyut/json/";
/** Node's fetch has no default request timeout; without this a hung upstream would block callers. */
const CBU_FETCH_TIMEOUT_MS = 8_000;

export type CurrencyRateSnapshot = {
  values: Record<SupportedCurrency, number>;
  fetchedAt: string;
};

/**
 * Durable fallback for the in-memory cache. Rates are needed on the transaction
 * write path, so a cold process plus an upstream outage must not fail writes:
 * the API loads the last persisted snapshot instead.
 */
export type CurrencyRateStore = {
  load: () => Promise<CurrencyRateSnapshot | null>;
  save: (snapshot: CurrencyRateSnapshot) => Promise<void>;
};

let cachedRates: CurrencyRateSnapshot | null = null;
let rateStore: CurrencyRateStore | null = null;
let inFlightRefresh: Promise<CurrencyRateSnapshot> | null = null;

export function setCurrencyRateStore(store: CurrencyRateStore | null) {
  rateStore = store;
}

/**
 * Seeds the in-memory cache from the durable store. Used when an upstream refresh
 * fails so currency-dependent writes keep working with the last known rates.
 */
export async function primeCurrencyRatesFromStore(): Promise<CurrencyRateSnapshot | null> {
  if (!rateStore) {
    return null;
  }

  const stored = await rateStore.load();
  if (stored) {
    cachedRates = stored;
  }

  return stored;
}

export function isSupportedCurrency(value: string): value is SupportedCurrency {
  return SUPPORTED_CURRENCY_SET.has(value);
}

export function normalizeCurrency(value?: string | null): SupportedCurrency {
  const normalized = value?.trim().toUpperCase() ?? "UZS";
  if (isSupportedCurrency(normalized)) {
    return normalized;
  }

  return "UZS";
}

export function isCurrencyRateRecord(value: unknown): value is Record<SupportedCurrency, number> {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;
  return SUPPORTED_CURRENCIES.every((currency) => {
    const rate = record[currency];
    return typeof rate === "number" && Number.isFinite(rate) && rate > 0;
  });
}

async function fetchRatesFromUpstream(): Promise<Record<SupportedCurrency, number>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CBU_FETCH_TIMEOUT_MS);

  let payload: CbuRateEntry[];
  try {
    const response = await fetch(CBU_RATES_URL, {
      headers: {
        Accept: "application/json"
      },
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Currency rate request failed with status ${response.status}`);
    }

    payload = (await response.json()) as CbuRateEntry[];
  } finally {
    clearTimeout(timeout);
  }

  const values: Record<SupportedCurrency, number> = {
    UZS: 1,
    USD: 0,
    EUR: 0,
    RUB: 0,
    GBP: 0,
    JPY: 0,
    CNY: 0,
    KZT: 0,
    TRY: 0,
    AED: 0
  };

  for (const entry of payload) {
    const currency = normalizeCurrency(entry.Ccy);
    if (currency === "UZS") {
      continue;
    }

    const nominal = Number(entry.Nominal);
    const rate = Number(entry.Rate);
    if (!Number.isFinite(nominal) || nominal <= 0 || !Number.isFinite(rate) || rate <= 0) {
      continue;
    }

    if (isSupportedCurrency(currency)) {
      values[currency] = Number((rate / nominal).toFixed(6));
    }
  }

  for (const currency of SUPPORTED_CURRENCIES) {
    if (values[currency] <= 0) {
      if (cachedRates?.values[currency]) {
        values[currency] = cachedRates.values[currency];
        continue;
      }

      throw new Error(`Missing currency rate for ${currency}`);
    }
  }

  return values;
}

async function refreshRates(): Promise<CurrencyRateSnapshot> {
  const values = await fetchRatesFromUpstream();
  const snapshot: CurrencyRateSnapshot = {
    values,
    fetchedAt: new Date().toISOString()
  };

  cachedRates = snapshot;

  if (rateStore) {
    try {
      await rateStore.save(snapshot);
    } catch {
      // Persistence is a fallback, not a correctness requirement for this call.
    }
  }

  return snapshot;
}

export async function getLatestCurrencyRatesSnapshot(options?: { forceRefresh?: boolean }): Promise<CurrencyRateSnapshot> {
  if (cachedRates && !options?.forceRefresh) {
    return cachedRates;
  }

  if (options?.forceRefresh) {
    return refreshRates();
  }

  // Collapse concurrent cold-start callers onto one upstream request.
  if (!inFlightRefresh) {
    inFlightRefresh = refreshRates().finally(() => {
      inFlightRefresh = null;
    });
  }

  try {
    return await inFlightRefresh;
  } catch (error) {
    // Upstream is unreachable and memory is cold. Fall back to the last snapshot
    // we persisted so money entry keeps working with slightly stale rates.
    if (rateStore) {
      const stored = await rateStore.load().catch(() => null);
      if (stored) {
        cachedRates = stored;
        return stored;
      }
    }

    throw error;
  }
}

export async function getLatestCurrencyRates(options?: { forceRefresh?: boolean }): Promise<Record<SupportedCurrency, number>> {
  const snapshot = await getLatestCurrencyRatesSnapshot(options);
  return snapshot.values;
}

export function getCachedCurrencyRates() {
  return cachedRates;
}

export function formatCurrencyRatesLog(rates: Record<SupportedCurrency, number>) {
  return SUPPORTED_CURRENCIES.map((currency) => `${currency}=${rates[currency]}`).join(", ");
}

export function convertToUzs(amount: number, exchangeRate: number): number {
  return Number((amount * exchangeRate).toFixed(2));
}

export function convertFromUzs(amountInUzs: number, displayRate: number): number {
  if (displayRate <= 0) {
    return 0;
  }

  return Number((amountInUzs / displayRate).toFixed(2));
}
