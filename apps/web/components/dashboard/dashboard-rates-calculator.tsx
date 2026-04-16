"use client";

import { ArrowRightLeft } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";

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
        <div className="grid gap-3 xl:grid-cols-[minmax(220px,1.15fr)_minmax(180px,0.9fr)_auto_minmax(180px,0.9fr)_minmax(220px,1.15fr)] xl:items-stretch">
          <div className="detail-box flex min-h-16 items-center px-4 py-3">
            <TextField
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              type="text"
              inputMode="decimal"
              placeholder="Amount"
              className="min-h-0 border-0 bg-transparent px-0 py-0 font-[family-name:var(--font-body)] text-[clamp(24px,3vw,36px)] font-medium leading-[1.05] tracking-[0.01em] text-[var(--ink)] tabular-nums placeholder:text-[var(--ink-soft)] focus-visible:ring-0"
            />
          </div>

          <label className="space-y-2 text-[15px]">
            <span className="field-label text-[15px] uppercase tracking-[0.14em]">From</span>
            <SelectField
              value={fromCurrency}
              onChange={(event) => setFromCurrency(event.target.value as SupportedCurrency)}
              triggerClassName="min-h-16 px-5 text-[20px] font-medium [&>span]:text-[20px]"
              optionClassName="text-[18px]"
            >
              {currencies.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </SelectField>
          </label>

          <div className="flex items-end">
            <Button
              type="button"
              className="min-h-12 w-full !justify-start px-6 py-4 text-[14px] font-semibold uppercase tracking-[0.14em] xl:w-auto xl:min-w-[170px] xl:flex-none [&>span]:flex [&>span]:w-full [&>span]:items-center [&>span]:gap-2"
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
          </div>

          <label className="space-y-2 text-[15px]">
            <span className="field-label text-[15px] uppercase tracking-[0.14em]">To</span>
            <SelectField
              value={toCurrency}
              onChange={(event) => setToCurrency(event.target.value as SupportedCurrency)}
              triggerClassName="min-h-16 px-5 text-[20px] font-medium [&>span]:text-[20px]"
              optionClassName="text-[18px]"
            >
              {currencies.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </SelectField>
          </label>

          <div className="detail-box flex min-h-16 flex-col justify-center space-y-2 px-4 py-3">
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
