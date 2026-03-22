"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import type { DashboardResponse, SupportedCurrency } from "@/components/profile/types";

type DashboardTrendsPanelProps = {
  charts: DashboardResponse["charts"];
  displayCurrency: SupportedCurrency;
  rates: Record<SupportedCurrency, number>;
};

type ExpenseChartMode = "BAR" | "PIE";
type ExpenseValueMode = "ABSOLUTE" | "PERCENT";

const pieColors = ["#10b981", "#f59e0b", "#3b82f6", "#ef4444", "#8b5cf6", "#14b8a6", "#fb7185", "#84cc16"];

function convertAmount(amountInUzs: number, rate: number) {
  if (rate <= 0) {
    return 0;
  }

  return Number((amountInUzs / rate).toFixed(2));
}

function formatAmount(value: number) {
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function renderValue(value: number, mode: ExpenseValueMode) {
  if (mode === "PERCENT") {
    return `${formatAmount(value)}%`;
  }

  return formatAmount(value);
}

function buildPieGradient(values: Array<{ share: number; color: string }>) {
  let cursor = 0;
  const segments: string[] = [];

  for (const item of values) {
    const start = cursor;
    const end = cursor + item.share;
    segments.push(`${item.color} ${start}% ${end}%`);
    cursor = end;
  }

  return segments.join(", ");
}

export function DashboardTrendsPanel({ charts, displayCurrency, rates }: DashboardTrendsPanelProps) {
  const [expenseChartMode, setExpenseChartMode] = useState<ExpenseChartMode>("BAR");
  const [expenseValueMode, setExpenseValueMode] = useState<ExpenseValueMode>("ABSOLUTE");

  const displayRate = rates[displayCurrency];
  const trendPeak = Math.max(1, ...charts.trend.items.map((item) => Math.max(item.income, item.expense)));
  const expensePeak =
    expenseValueMode === "ABSOLUTE" ? Math.max(1, ...charts.breakdown.items.map((item) => convertAmount(item.totalExpense, displayRate))) : 100;

  const expensePieSlices = useMemo(
    () =>
      charts.breakdown.items.map((item, index) => ({
        ...item,
        color: pieColors[index % pieColors.length],
        displayAmount: convertAmount(item.totalExpense, displayRate)
      })),
    [charts.breakdown.items, displayRate]
  );

  const expensePieGradient = buildPieGradient(expensePieSlices.map((item) => ({ share: item.share, color: item.color })));

  return (
    <section className="mb-6 grid gap-4">
      <Card className="panel-soft">
        <CardHeader>
          <CardTitle>Trend breakdown</CardTitle>
          <CardDescription>Chronological income and expense buckets for the active filter range.</CardDescription>
        </CardHeader>
        <CardContent>
          {charts.trend.items.length === 0 ? (
            <p className="body-muted text-sm">No trend data for the selected filters.</p>
          ) : (
            <div className="overflow-x-auto pb-2">
              <div className="flex min-w-[720px] items-end gap-3">
                {charts.trend.items.map((item) => {
                  const incomeHeight = Math.max(10, (item.income / trendPeak) * 100);
                  const expenseHeight = Math.max(10, (item.expense / trendPeak) * 100);
                  return (
                    <div key={`${item.start}-${item.end}`} className="flex min-w-[78px] flex-1 flex-col items-center gap-2">
                      <div className="flex h-[260px] items-end gap-2">
                        <div className="flex w-7 items-end justify-center rounded-t-[12px] bg-emerald-500/20" style={{ height: `${incomeHeight}%` }}>
                          <span className="mb-1 text-[10px] font-medium text-emerald-700 dark:text-emerald-200">{formatAmount(convertAmount(item.income, displayRate))}</span>
                        </div>
                        <div className="flex w-7 items-end justify-center rounded-t-[12px] bg-rose-500/20" style={{ height: `${expenseHeight}%` }}>
                          <span className="mb-1 text-[10px] font-medium text-rose-700 dark:text-rose-200">{formatAmount(convertAmount(item.expense, displayRate))}</span>
                        </div>
                      </div>
                      <div className="space-y-1 text-center">
                        <p className="text-xs font-medium leading-tight">{item.label}</p>
                        <p className="body-muted text-[11px]">{item.net >= 0 ? "+" : "-"}{formatAmount(Math.abs(convertAmount(item.net, displayRate)))} {displayCurrency}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="panel-soft">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Expense breakdown</CardTitle>
              <CardDescription>Switch between bar and pie views. The value mode changes between absolute amounts and shares.</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-full border border-white/10 bg-black/5 p-1 dark:bg-white/5">
                <Button type="button" size="sm" variant={expenseChartMode === "BAR" ? "default" : "ghost"} className="rounded-full" onClick={() => setExpenseChartMode("BAR")}>
                  Bar
                </Button>
                <Button type="button" size="sm" variant={expenseChartMode === "PIE" ? "default" : "ghost"} className="rounded-full" onClick={() => setExpenseChartMode("PIE")}>
                  Pie
                </Button>
              </div>
              <div className="inline-flex rounded-full border border-white/10 bg-black/5 p-1 dark:bg-white/5">
                <Button type="button" size="sm" variant={expenseValueMode === "ABSOLUTE" ? "default" : "ghost"} className="rounded-full" onClick={() => setExpenseValueMode("ABSOLUTE")}>
                  Absolute
                </Button>
                <Button type="button" size="sm" variant={expenseValueMode === "PERCENT" ? "default" : "ghost"} className="rounded-full" onClick={() => setExpenseValueMode("PERCENT")}>
                  Percent
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {charts.breakdown.items.length === 0 ? (
            <p className="body-muted text-sm">No expense breakdown yet for this filter set.</p>
          ) : expenseChartMode === "BAR" ? (
            <div className="overflow-x-auto pb-2">
              <div className="flex min-w-[720px] items-end gap-3">
                {charts.breakdown.items.map((item, index) => {
                  const displayAmount = convertAmount(item.totalExpense, displayRate);
                  const barValue = expenseValueMode === "ABSOLUTE" ? displayAmount : item.share;
                  const barHeight = Math.max(8, (barValue / expensePeak) * 100);
                  const color = pieColors[index % pieColors.length];
                  return (
                    <div key={item.categoryId} className="flex min-w-[78px] flex-1 flex-col items-center gap-2">
                      <div className="flex h-[240px] w-full items-end justify-center rounded-[18px] bg-[color-mix(in_srgb,var(--gold)_7%,transparent)] px-2 pb-2">
                        <div className="flex h-full w-full items-end justify-center">
                          <div className="flex w-8 items-end justify-center rounded-t-[14px]" style={{ height: `${barHeight}%`, backgroundColor: color }}>
                            <span className="mb-1 text-[10px] font-medium text-white">{renderValue(barValue, expenseValueMode)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-1 text-center">
                        <p className="text-xs font-medium leading-tight">{item.categoryName}</p>
                        <p className="body-muted text-[11px]">{expenseValueMode === "ABSOLUTE" ? `${formatAmount(displayAmount)} ${displayCurrency}` : `${formatAmount(item.share)}% of total`}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,240px)_minmax(0,1fr)] lg:items-center">
              <div className="mx-auto flex h-[220px] w-[220px] items-center justify-center rounded-full border border-white/10 bg-[color-mix(in_srgb,var(--gold)_6%,transparent)] p-4">
                <div
                  className="relative flex h-full w-full items-center justify-center rounded-full"
                  style={{
                    background: `conic-gradient(${expensePieGradient})`
                  }}
                >
                  <div className="flex h-[120px] w-[120px] flex-col items-center justify-center rounded-full border border-white/10 bg-[color-mix(in_srgb,var(--bg-base)_92%,transparent)] text-center shadow-[0_10px_24px_rgba(0,0,0,0.08)]">
                    <p className="text-xs uppercase tracking-[0.16em] text-[var(--ink-soft)]">Total</p>
                    <p className="mt-1 text-lg font-semibold">
                      {expenseValueMode === "ABSOLUTE"
                        ? `${formatAmount(convertAmount(charts.breakdown.items.reduce((sum, item) => sum + item.totalExpense, 0), displayRate))} ${displayCurrency}`
                        : "100%"}
                    </p>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                {expensePieSlices.map((item) => (
                  <div key={item.categoryId} className="detail-box flex items-center justify-between gap-3 px-3 py-2 text-sm">
                    <div className="flex items-center gap-3">
                      <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <div>
                        <p className="font-medium">{item.categoryName}</p>
                        <p className="body-muted text-xs">{formatAmount(item.share)}% of expense total</p>
                      </div>
                    </div>
                    <p className="font-semibold">
                      {expenseValueMode === "ABSOLUTE"
                        ? `${formatAmount(item.displayAmount)} ${displayCurrency}`
                        : `${formatAmount(item.share)}%`}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
