"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

import { ChartScrollLane } from "@/components/dashboard/chart-scroll-lane";
import type { DashboardKind, DashboardResponse, SupportedCurrency } from "@/components/profile/types";

type DashboardBreakdownPanelProps = {
  charts: DashboardResponse["charts"];
  displayCurrency: SupportedCurrency;
  rates: Record<SupportedCurrency, number>;
  kind: DashboardKind;
};

const expenseColors = ["#ef4444", "#f97316", "#fb7185", "#dc2626", "#f43f5e", "#fb923c"];
const incomeColors = ["#10b981", "#14b8a6", "#22c55e", "#06b6d4", "#34d399", "#2dd4bf"];

function convertAmount(amountInUzs: number, rate: number) {
  if (rate <= 0) {
    return 0;
  }

  return Number((amountInUzs / rate).toFixed(2));
}

function formatAmount(value: number) {
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function getBreakdownAmount(item: DashboardResponse["charts"]["breakdown"]["items"][number]) {
  return item.totalAmountInUzs ?? item.totalExpense ?? 0;
}

function getBreakdownKind(
  item: DashboardResponse["charts"]["breakdown"]["items"][number],
  fallbackKind: DashboardKind
): "EXPENSE" | "INCOME" {
  if (item.kind) {
    return item.kind;
  }

  if (fallbackKind !== "ALL") {
    return fallbackKind;
  }

  return "EXPENSE";
}

function getColor(kind: "EXPENSE" | "INCOME", index: number) {
  const palette = kind === "EXPENSE" ? expenseColors : incomeColors;
  return palette[index % palette.length];
}

function kindLabel(kind: "EXPENSE" | "INCOME") {
  return kind === "INCOME" ? "Income" : "Expense";
}

function kindPillClass(kind: "EXPENSE" | "INCOME") {
  return kind === "INCOME"
    ? "border-[rgba(16,185,129,0.2)] bg-[color-mix(in_srgb,rgba(16,185,129,0.14),transparent)] text-[var(--sage)]"
    : "border-[rgba(239,68,68,0.2)] bg-[color-mix(in_srgb,rgba(239,68,68,0.12),transparent)] text-[var(--blush-deep)]";
}

export function DashboardBreakdownPanel({ charts, displayCurrency, rates, kind }: DashboardBreakdownPanelProps) {
  const displayRate = rates[displayCurrency];
  const breakdownItems = charts.breakdown.items.map((item, index) => {
    const amountInUzs = getBreakdownAmount(item);
    const itemKind = getBreakdownKind(item, kind);
    return {
      ...item,
      amountInUzs,
      itemKind,
      color: getColor(itemKind, index)
    };
  });
  const peak = Math.max(1, ...breakdownItems.map((item) => item.amountInUzs));

  return (
    <section className="mb-6 grid w-full min-w-0 gap-4">
      <Card className="panel-soft w-full min-w-0 overflow-hidden">
        <CardHeader>
          <CardTitle>Transactions breakdown</CardTitle>
          <CardDescription>Totals by category for the active filters. Green bars are income, rose bars are expense.</CardDescription>
        </CardHeader>
        <CardContent className="min-w-0">
          {breakdownItems.length === 0 ? (
            <p className="body-muted text-sm">No transactions match this filter set.</p>
          ) : (
            <ChartScrollLane itemCount={breakdownItems.length} minItemWidth={112}>
              {breakdownItems.map((item) => {
                const barHeight = Math.max(10, (item.amountInUzs / peak) * 100);
                const displayAmount = convertAmount(item.amountInUzs, displayRate);

                return (
                  <div key={item.categoryId} className="flex min-w-[112px] flex-1 flex-col items-center gap-2">
                    <div className="flex h-[240px] w-full items-end justify-center rounded-[20px] border border-[rgba(201,168,76,0.12)] bg-[color-mix(in_srgb,var(--gold)_7%,transparent)] px-2 pb-2 shadow-[0_10px_22px_rgba(26,20,16,0.04)]">
                      <div className="flex h-full w-full items-end justify-center">
                        <div className="flex w-10 items-end justify-center rounded-t-[16px] shadow-[0_8px_16px_rgba(26,20,16,0.1)]" style={{ height: `${barHeight}%`, backgroundColor: item.color }}>
                          <span className="mb-1 text-[10px] font-semibold text-white">{formatAmount(displayAmount)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1 text-center">
                      <p className="text-[11px] font-medium leading-tight">{item.categoryName}</p>
                      <p className={`inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] ${kindPillClass(item.itemKind)}`}>
                        {kindLabel(item.itemKind)}
                      </p>
                      <p className="body-muted text-[11px]">
                        {formatAmount(displayAmount)} {displayCurrency}
                      </p>
                      <p className="body-muted text-[11px]">{formatAmount(item.share)}% of total</p>
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
