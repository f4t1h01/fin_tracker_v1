"use client";

import { ArrowRightLeft } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";

import { currencyLabels, type SupportedCurrency } from "@/components/profile/types";

type DashboardRatesCalculatorProps = {
  currencies: SupportedCurrency[];
  rates: Record<SupportedCurrency, number>;
};

function resolveFallbackCurrency(currencies: SupportedCurrency[]) {
  return currencies[0] ?? "UZS";
}

function resolveSecondaryCurrency(currencies: SupportedCurrency[]) {
  return currencies[1] ?? currencies[0] ?? "UZS";
}

function formatAmount(value: number) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(value);
}

export function DashboardRatesCalculator({ currencies, rates }: DashboardRatesCalculatorProps) {
  const [amount, setAmount] = useState("1");
  const [fromCurrency, setFromCurrency] = useState<SupportedCurrency>(resolveFallbackCurrency(currencies));
  const [toCurrency, setToCurrency] = useState<SupportedCurrency>(resolveSecondaryCurrency(currencies));

  useEffect(() => {
    const fallbackCurrency = resolveFallbackCurrency(currencies);
    const secondaryCurrency = resolveSecondaryCurrency(currencies);

    setFromCurrency((current) => (currencies.includes(current) ? current : fallbackCurrency));
    setToCurrency((current) => {
      if (currencies.length <= 1) {
        return fallbackCurrency;
      }

      return currencies.includes(current) ? current : secondaryCurrency;
    });
  }, [currencies]);

  const parsedAmount = useMemo(() => {
    const value = Number(amount);
    return Number.isFinite(value) ? value : 0;
  }, [amount]);

  const convertedAmount = useMemo(() => {
    if (fromCurrency === toCurrency) {
      return parsedAmount;
    }

    const fromRate = rates[fromCurrency];
    const toRate = rates[toCurrency];
    if (fromRate <= 0 || toRate <= 0) {
      return 0;
    }

    return Number(((parsedAmount * fromRate) / toRate).toFixed(2));
  }, [fromCurrency, parsedAmount, rates, toCurrency]);

  const canSwap = currencies.length > 1;

  return (
    <Card className="panel-soft mb-6">
      <CardHeader>
        <CardTitle className="text-[22px]">Quick calculator</CardTitle>
        <CardDescription>
          Convert between your currently visible currencies. The dropdowns follow the preview selection above before you save it.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)_auto_minmax(0,0.9fr)] lg:items-end">
          <label className="space-y-1 text-sm">
            <span className="field-label">Amount</span>
            <TextField
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              type="number"
              min="0"
              step="any"
              inputMode="decimal"
              placeholder="1"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="field-label">From</span>
            <SelectField value={fromCurrency} onChange={(event) => setFromCurrency(event.target.value as SupportedCurrency)}>
              {currencies.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </SelectField>
          </label>
          <Button
            type="button"
            variant="outline"
            className="w-full lg:w-auto"
            disabled={!canSwap}
            onClick={() => {
              if (!canSwap) {
                return;
              }

              setFromCurrency(toCurrency);
              setToCurrency(fromCurrency);
            }}
          >
            <ArrowRightLeft className="size-4" />
            Swap
          </Button>
          <label className="space-y-1 text-sm">
            <span className="field-label">To</span>
            <SelectField value={toCurrency} onChange={(event) => setToCurrency(event.target.value as SupportedCurrency)}>
              {currencies.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </SelectField>
          </label>
        </div>

        <div className="detail-box space-y-2 px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ink-soft)]">
            {currencyLabels[fromCurrency]} to {currencyLabels[toCurrency]}
          </p>
          <p className="font-[family-name:var(--font-body)] text-[clamp(24px,3.6vw,36px)] font-medium leading-[1.05] tabular-nums text-[var(--ink)]">
            {formatAmount(parsedAmount)} {fromCurrency} = {formatAmount(convertedAmount)} {toCurrency}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
