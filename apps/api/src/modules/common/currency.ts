type CbuRateEntry = {
  Ccy: string;
  Nominal: string;
  Rate: string;
};

export const SUPPORTED_CURRENCIES = ["UZS", "USD", "EUR", "RUB", "GBP", "JPY", "CNY", "KZT", "TRY", "AED"] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

const SUPPORTED_CURRENCY_SET = new Set<string>(SUPPORTED_CURRENCIES);
export const CBU_RATES_URL = "https://cbu.uz/uz/arkhiv-kursov-valyut/json/";

let cachedRates:
  | {
      values: Record<SupportedCurrency, number>;
      fetchedAt: string;
    }
  | null = null;

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

export async function getLatestCurrencyRatesSnapshot(options?: { forceRefresh?: boolean }): Promise<{
  values: Record<SupportedCurrency, number>;
  fetchedAt: string;
}> {
  if (cachedRates && !options?.forceRefresh) {
    return cachedRates;
  }

  const response = await fetch(CBU_RATES_URL, {
    headers: {
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`Currency rate request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as CbuRateEntry[];
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

  cachedRates = {
    values,
    fetchedAt: new Date().toISOString()
  };

  return cachedRates;
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
