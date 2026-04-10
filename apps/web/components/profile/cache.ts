import { supportedCurrencies, type DashboardResponse, type ProfileSnapshotResponse, type SupportedCurrency } from "./types";

const profileSnapshotKey = "duet-profile-snapshot";
const dashboardSnapshotKey = "duet-dashboard-snapshot";
const dashboardDisplayCurrencyKey = "duet-dashboard-display-currency";
const dashboardRateCurrenciesKey = "duet-dashboard-rate-currencies";
const defaultDashboardRateCurrencies: SupportedCurrency[] = ["UZS", "USD"];

export const dashboardRateCurrenciesUpdatedEvent = "duet-dashboard-rate-currencies-updated";

export function normalizeDashboardRateCurrencies(value?: readonly string[] | null): SupportedCurrency[] {
  if (!value?.length) {
    return [...defaultDashboardRateCurrencies];
  }

  const seen = new Set<SupportedCurrency>();

  for (const token of value) {
    const normalized = token.trim().toUpperCase() as SupportedCurrency;
    if (supportedCurrencies.includes(normalized)) {
      seen.add(normalized);
    }
  }

  const normalized = supportedCurrencies.filter((currency) => seen.has(currency));
  return normalized.length > 0 ? normalized : [...defaultDashboardRateCurrencies];
}

export function clampDashboardRateCurrency(value: string | null | undefined, preferredCurrencies: readonly SupportedCurrency[]) {
  if (value) {
    const normalized = value.toUpperCase() as SupportedCurrency;
    if (preferredCurrencies.includes(normalized)) {
      return normalized;
    }
  }

  return preferredCurrencies[0] ?? "UZS";
}

export function readProfileSnapshotCache(): ProfileSnapshotResponse | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(profileSnapshotKey);
    return raw ? (JSON.parse(raw) as ProfileSnapshotResponse) : null;
  } catch {
    return null;
  }
}

export function writeProfileSnapshotCache(value: ProfileSnapshotResponse) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(profileSnapshotKey, JSON.stringify(value));
}

export function clearProfileSnapshotCache() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(profileSnapshotKey);
}

export function readDashboardCache(): DashboardResponse | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(dashboardSnapshotKey);
    return raw ? (JSON.parse(raw) as DashboardResponse) : null;
  } catch {
    return null;
  }
}

export function writeDashboardCache(value: DashboardResponse) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(dashboardSnapshotKey, JSON.stringify(value));
}

export function clearDashboardCache() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(dashboardSnapshotKey);
}

export function hasDashboardRateCurrenciesCache() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.sessionStorage.getItem(dashboardRateCurrenciesKey) !== null;
}

export function readDashboardRateCurrenciesCache(): SupportedCurrency[] {
  if (typeof window === "undefined") {
    return [...defaultDashboardRateCurrencies];
  }

  try {
    const raw = window.sessionStorage.getItem(dashboardRateCurrenciesKey);
    return normalizeDashboardRateCurrencies(raw ? raw.split(",") : null);
  } catch {
    return [...defaultDashboardRateCurrencies];
  }
}

export function writeDashboardRateCurrenciesCache(value: readonly string[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(dashboardRateCurrenciesKey, normalizeDashboardRateCurrencies(value).join(","));
}

export function clearDashboardRateCurrenciesCache() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(dashboardRateCurrenciesKey);
}

export function syncDashboardRateCurrenciesCache(value: readonly string[]) {
  if (typeof window === "undefined") {
    return;
  }

  const normalized = normalizeDashboardRateCurrencies(value);
  window.sessionStorage.setItem(dashboardRateCurrenciesKey, normalized.join(","));
  window.dispatchEvent(new CustomEvent<SupportedCurrency[]>(dashboardRateCurrenciesUpdatedEvent, { detail: normalized }));
}

export function readDashboardDisplayCurrencyCache(): SupportedCurrency | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.sessionStorage.getItem(dashboardDisplayCurrencyKey);
  return supportedCurrencies.includes(raw as SupportedCurrency) ? (raw as SupportedCurrency) : null;
}

export function writeDashboardDisplayCurrencyCache(value: SupportedCurrency) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(dashboardDisplayCurrencyKey, value);
}

export function clearDashboardDisplayCurrencyCache() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(dashboardDisplayCurrencyKey);
}
