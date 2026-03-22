"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import type { DashboardResponse, SupportedCurrency } from "@/components/profile/types";

type DashboardChartsProps = {
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

export function DashboardCharts({ charts, displayCurrency, rates }: DashboardChartsProps) {
  const rate = rates[displayCurrency];
  const trendPeak = Math.max(1, ...charts.trend.items.map((item) => Math.max(item.income, item.expense, Math.abs(item.net))));
  const breakdownTotal = Math.max(1, charts.breakdown.items.reduce((sum, item) => sum + item.totalExpense, 0));

  return (
    <section className="mb-6 grid gap-4 lg:grid-cols-2">
      <Card className="panel-soft">
        <CardHeader>
          <CardTitle>Trend</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {charts.trend.items.length === 0 ? (
            <p className="body-muted text-sm">No trend data for the selected filters.</p>
          ) : (
            charts.trend.items.map((item) => {
              const incomeWidth = Math.max(8, (item.income / trendPeak) * 100);
              const expenseWidth = Math.max(8, (item.expense / trendPeak) * 100);
              return (
                <div key={`${item.start}-${item.end}`} className="space-y-1">
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="font-medium">{item.label}</span>
                    <span className="body-muted">{convertAmount(item.net, rate).toLocaleString()} {displayCurrency}</span>
                  </div>
                  <div className="space-y-1">
                    <div className="h-2 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--gold)_12%,transparent)]">
                      <div className="h-full rounded-full bg-emerald-500/80" style={{ width: `${incomeWidth}%` }} />
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--gold)_12%,transparent)]">
                      <div className="h-full rounded-full bg-rose-500/80" style={{ width: `${expenseWidth}%` }} />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card className="panel-soft">
        <CardHeader>
          <CardTitle>Expense breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {charts.breakdown.items.length === 0 ? (
            <p className="body-muted text-sm">No expense breakdown yet for this filter set.</p>
          ) : (
            charts.breakdown.items.map((item) => (
              <div key={item.categoryId} className="space-y-1">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="font-medium">{item.categoryName}</span>
                  <span className="body-muted">{convertAmount(item.totalExpense, rate).toLocaleString()} {displayCurrency}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--gold)_12%,transparent)]">
                  <div className="h-full rounded-full bg-[var(--gold)]" style={{ width: `${Math.max(4, item.share)}%` }} />
                </div>
              </div>
            ))
          )}
          <p className="body-muted text-xs uppercase tracking-[0.14em]">Share is based on the filtered expense total.</p>
        </CardContent>
      </Card>
    </section>
  );
}
