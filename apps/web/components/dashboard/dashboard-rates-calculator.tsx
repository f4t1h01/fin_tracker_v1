"use client";

import { ArrowRightLeft } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import { cn } from "@/lib/cn";

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
        <div className="space-y-4">
          <label className="block space-y-2 text-sm">
            <span className="field-label text-[13px] uppercase tracking-[0.14em]">Amount</span>
            <TextField
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              type="text"
              inputMode="decimal"
              placeholder="1"
              className={cn(
                "min-h-16 border-[rgba(201,168,76,0.16)] bg-[color-mix(in_srgb,var(--warm-white)_86%,transparent)] px-4 font-[family-name:var(--font-body)] text-[clamp(26px,3.5vw,38px)] font-medium leading-none tracking-[0.01em] text-[var(--ink)] tabular-nums placeholder:text-[var(--ink-soft)] focus-visible:border-[rgba(201,168,76,0.22)]"
              )}
            />
          </label>

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-end">
            <label className="space-y-2 text-[15px]">
              <span className="field-label text-[14px] uppercase tracking-[0.14em]">From</span>
              <SelectField
                value={fromCurrency}
                onChange={(event) => setFromCurrency(event.target.value as SupportedCurrency)}
                triggerClassName="min-h-16 px-4 text-[18px] font-medium [&>span]:text-[18px]"
                optionClassName="text-[16px]"
              >
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
              className="min-h-14 w-full !justify-start px-6 py-4 text-[14px] font-semibold uppercase tracking-[0.14em] lg:w-auto lg:flex-none"
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
            <label className="space-y-2 text-[15px]">
              <span className="field-label text-[14px] uppercase tracking-[0.14em]">To</span>
              <SelectField
                value={toCurrency}
                onChange={(event) => setToCurrency(event.target.value as SupportedCurrency)}
                triggerClassName="min-h-16 px-4 text-[18px] font-medium [&>span]:text-[18px]"
                optionClassName="text-[16px]"
              >
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
              Output {toCurrency}
            </p>
            <p className="font-[family-name:var(--font-body)] text-[clamp(24px,3.6vw,36px)] font-medium leading-[1.05] tabular-nums text-[var(--ink)]">
              {formatAmount(convertedAmount)} {toCurrency}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
