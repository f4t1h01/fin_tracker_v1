"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { ChartScrollLane } from "@/components/dashboard/chart-scroll-lane";
import type { DashboardResponse, SupportedCurrency } from "@/components/profile/types";

type DashboardTrendChartProps = {
  charts: DashboardResponse["charts"];
  displayCurrency: SupportedCurrency;
  rates: Record<SupportedCurrency, number>;
};

function convertAmount(amountInUzs: number, rate: number) {
  if (rate <= 0) {
    return 0;
  }

  return Number((amountInUzs / rate).toFixed(2));
}

function formatAmount(value: number) {
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function DashboardTrendChart({ charts, displayCurrency, rates }: DashboardTrendChartProps) {
  const displayRate = rates[displayCurrency];
  const trendPeak = Math.max(1, ...charts.trend.items.map((item) => Math.max(item.income, item.expense)));

  return (
    <section className="mb-6 grid w-full min-w-0 gap-4">
      <Card className="panel-soft w-full min-w-0 overflow-hidden">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Transactions over time</CardTitle>
              <CardDescription>Daily buckets stay aligned to midnight. Wider ranges roll up into weeks or months so the chart stays readable.</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs font-medium">
              <span className="inline-flex items-center gap-2 rounded-full border border-[rgba(16,185,129,0.22)] bg-[color-mix(in_srgb,rgba(16,185,129,0.12),transparent)] px-3 py-1 text-[var(--sage)]">
                <span className="h-2.5 w-2.5 rounded-full bg-[rgb(16,185,129)]" />
                Income
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-[rgba(244,63,94,0.22)] bg-[color-mix(in_srgb,rgba(244,63,94,0.12),transparent)] px-3 py-1 text-[var(--blush-deep)]">
                <span className="h-2.5 w-2.5 rounded-full bg-[rgb(244,63,94)]" />
                Expense
              </span>
            </div>
          </div>
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
                      <div
                        className="flex w-7 items-end justify-center rounded-t-[14px] bg-[linear-gradient(180deg,rgba(16,185,129,0.92),rgba(16,185,129,0.62))] shadow-[0_8px_18px_rgba(16,185,129,0.14)]"
                        style={{ height: `${incomeHeight}%` }}
                      >
                        <span className="mb-1 text-[10px] font-semibold text-white">{formatAmount(convertAmount(item.income, displayRate))}</span>
                      </div>
                      <div
                        className="flex w-7 items-end justify-center rounded-t-[14px] bg-[linear-gradient(180deg,rgba(244,63,94,0.92),rgba(244,63,94,0.62))] shadow-[0_8px_18px_rgba(244,63,94,0.14)]"
                        style={{ height: `${expenseHeight}%` }}
                      >
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
    </section>
  );
}
