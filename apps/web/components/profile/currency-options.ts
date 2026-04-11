import { supportedCurrencies, type SupportedCurrency } from "./types";

export function buildSupportedCurrencyOptions(preferredCurrencies: readonly SupportedCurrency[], currentCurrency: SupportedCurrency) {
  const output: SupportedCurrency[] = [];
  const seen = new Set<SupportedCurrency>();

  for (const currency of preferredCurrencies) {
    if (!seen.has(currency)) {
      seen.add(currency);
      output.push(currency);
    }
  }

  if (!seen.has(currentCurrency) && supportedCurrencies.includes(currentCurrency)) {
    output.push(currentCurrency);
  }

  return output.length > 0 ? output : [currentCurrency];
}
