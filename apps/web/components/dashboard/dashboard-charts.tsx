"use client";

import { useMemo, useState } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartScrollLane } from "@/components/dashboard/chart-scroll-lane";
import { SegmentedControl } from "@/components/ui/segmented-control";

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
    <section className="mb-6 grid w-full min-w-0 gap-4">
      <Card className="panel-soft w-full min-w-0 overflow-hidden">
        <CardHeader>
          <CardTitle>Trend breakdown</CardTitle>
          <CardDescription>Chronological income and expense buckets for the active filter range. Green is income, rose is expense.</CardDescription>
        </CardHeader>
        <CardContent className="min-w-0">
          {charts.trend.items.length === 0 ? (
            <p className="body-muted text-sm">No trend data for the selected filters.</p>
          ) : (
            <ChartScrollLane itemCount={charts.trend.items.length} minItemWidth={88}>
              {charts.trend.items.map((item) => {
                const incomeHeight = Math.max(10, (item.income / trendPeak) * 100);
                const expenseHeight = Math.max(10, (item.expense / trendPeak) * 100);
                return (
                  <div key={`${item.start}-${item.end}`} className="flex min-w-[88px] flex-1 flex-col items-center gap-2">
                    <div className="flex h-[260px] items-end gap-2">
                      <div className="flex w-7 items-end justify-center rounded-t-[14px] bg-[linear-gradient(180deg,rgba(16,185,129,0.92),rgba(16,185,129,0.62))] shadow-[0_8px_18px_rgba(16,185,129,0.14)]" style={{ height: `${incomeHeight}%` }}>
                        <span className="mb-1 text-[10px] font-semibold text-white">{formatAmount(convertAmount(item.income, displayRate))}</span>
                      </div>
                      <div className="flex w-7 items-end justify-center rounded-t-[14px] bg-[linear-gradient(180deg,rgba(244,63,94,0.92),rgba(244,63,94,0.62))] shadow-[0_8px_18px_rgba(244,63,94,0.14)]" style={{ height: `${expenseHeight}%` }}>
                        <span className="mb-1 text-[10px] font-semibold text-white">{formatAmount(convertAmount(item.expense, displayRate))}</span>
                      </div>
                    </div>
                    <div className="space-y-1 text-center">
                      <p className="text-[11px] font-medium leading-tight">{item.label}</p>
                      <p className="body-muted text-[11px]">
                        {item.net >= 0 ? "+" : "-"}
                        {formatAmount(Math.abs(convertAmount(item.net, displayRate)))} {displayCurrency}
                      </p>
                    </div>
                  </div>
                );
              })}
            </ChartScrollLane>
          )}
        </CardContent>
      </Card>

      <Card className="panel-soft w-full min-w-0 overflow-hidden">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Expense breakdown</CardTitle>
              <CardDescription>Switch between bar and pie views. The value mode changes between absolute amounts and shares.</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <SegmentedControl
                ariaLabel="Expense chart type"
                value={expenseChartMode}
                onChange={(next) => setExpenseChartMode(next)}
                options={[
                  { value: "BAR", label: "Bar" },
                  { value: "PIE", label: "Pie" }
                ]}
              />
              <SegmentedControl
                ariaLabel="Expense value mode"
                value={expenseValueMode}
                onChange={(next) => setExpenseValueMode(next)}
                options={[
                  { value: "ABSOLUTE", label: "Absolute" },
                  { value: "PERCENT", label: "Percent" }
                ]}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="min-w-0">
          {charts.breakdown.items.length === 0 ? (
            <p className="body-muted text-sm">No expense breakdown yet for this filter set.</p>
          ) : expenseChartMode === "BAR" ? (
            <ChartScrollLane itemCount={charts.breakdown.items.length} minItemWidth={88}>
              {charts.breakdown.items.map((item, index) => {
                const displayAmount = convertAmount(item.totalExpense, displayRate);
                const barValue = expenseValueMode === "ABSOLUTE" ? displayAmount : item.share;
                const barHeight = Math.max(8, (barValue / expensePeak) * 100);
                const color = pieColors[index % pieColors.length];
                return (
                  <div key={item.categoryId} className="flex min-w-[88px] flex-1 flex-col items-center gap-2">
                    <div className="flex h-[240px] w-full items-end justify-center rounded-[20px] border border-[rgba(201,168,76,0.12)] bg-[color-mix(in_srgb,var(--gold)_7%,transparent)] px-2 pb-2 shadow-[0_10px_22px_rgba(26,20,16,0.04)]">
                      <div className="flex h-full w-full items-end justify-center">
                        <div className="flex w-8 items-end justify-center rounded-t-[16px] shadow-[0_8px_16px_rgba(26,20,16,0.1)]" style={{ height: `${barHeight}%`, backgroundColor: color }}>
                          <span className="mb-1 text-[10px] font-semibold text-white">{renderValue(barValue, expenseValueMode)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1 text-center">
                      <p className="text-[11px] font-medium leading-tight">{item.categoryName}</p>
                      <p className="body-muted text-[11px]">{expenseValueMode === "ABSOLUTE" ? `${formatAmount(displayAmount)} ${displayCurrency}` : `${formatAmount(item.share)}% of total`}</p>
                    </div>
                  </div>
                );
              })}
            </ChartScrollLane>
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
