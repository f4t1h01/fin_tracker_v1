"use client";

import { ArrowRightLeft } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SelectField } from "@/components/ui/select-field";

import type { SupportedCurrency } from "@/components/profile/types";

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
        <div className="grid gap-3 xl:grid-cols-[minmax(220px,1.08fr)_minmax(180px,0.84fr)_auto_minmax(180px,0.84fr)_minmax(250px,1.16fr)] xl:items-stretch">
          <div className="detail-box flex min-h-[90px] items-center px-5 py-4">
            <input
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              type="text"
              inputMode="decimal"
              placeholder="Amount"
              className="w-full border-0 bg-transparent p-0 font-[family-name:var(--font-body)] text-[clamp(24px,3vw,36px)] font-medium leading-[1.05] tracking-[0.01em] text-[var(--ink)] tabular-nums outline-none placeholder:text-[var(--ink-soft)]"
            />
          </div>

          <div className="detail-box flex min-h-[90px] flex-col justify-center space-y-2 px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ink-soft)]">From</p>
            <SelectField
              value={fromCurrency}
              onChange={(event) => setFromCurrency(event.target.value as SupportedCurrency)}
              triggerClassName="min-h-0 border-0 bg-transparent px-0 py-0 text-[20px] font-medium shadow-none [&>span]:text-[20px]"
              optionClassName="text-[18px]"
            >
              {currencies.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </SelectField>
          </div>

          <div className="flex items-stretch xl:items-center">
            <Button
              type="button"
              className="min-h-[90px] w-full px-4 py-4 xl:w-auto xl:min-w-[96px] xl:flex-none [&>span]:flex [&>span]:w-full [&>span]:items-center [&>span]:justify-center"
              disabled={!canSwap}
              onClick={() => {
                if (!canSwap) {
                  return;
                }

                setFromCurrency(toCurrency);
                setToCurrency(fromCurrency);
              }}
              aria-label="Swap currencies"
              title="Swap currencies"
            >
              <ArrowRightLeft className="size-6" />
            </Button>
          </div>

          <div className="detail-box flex min-h-[90px] flex-col justify-center space-y-2 px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ink-soft)]">To</p>
            <SelectField
              value={toCurrency}
              onChange={(event) => setToCurrency(event.target.value as SupportedCurrency)}
              triggerClassName="min-h-0 border-0 bg-transparent px-0 py-0 text-[20px] font-medium shadow-none [&>span]:text-[20px]"
              optionClassName="text-[18px]"
            >
              {currencies.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </SelectField>
          </div>

          <div className="detail-box flex min-h-[90px] flex-col justify-center space-y-2 px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ink-soft)]">
              Output {toCurrency}
            </p>
            <p className="font-[family-name:var(--font-body)] text-[clamp(24px,3vw,36px)] font-medium leading-[1.05] tabular-nums text-[var(--ink)]">
              {formatAmount(convertedAmount)} {toCurrency}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
