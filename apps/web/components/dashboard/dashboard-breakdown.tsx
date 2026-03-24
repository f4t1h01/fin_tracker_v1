"use client";

import { useMemo, useState } from "react";

import type { DashboardKind, DashboardResponse, SupportedCurrency } from "@/components/profile/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SegmentedControl } from "@/components/ui/segmented-control";

type BreakdownValueMode = "ABSOLUTE" | "PERCENT";

type DashboardBreakdownPanelProps = {
  charts: DashboardResponse["charts"];
  displayCurrency: SupportedCurrency;
  rates: Record<SupportedCurrency, number>;
  kind: DashboardKind;
};

const expenseColors = ["#4f46e5", "#6366f1", "#7c3aed", "#8b5cf6", "#2563eb", "#3b82f6", "#0ea5e9", "#06b6d4"];
const incomeColors = ["#10b981", "#14b8a6", "#22c55e", "#06b6d4", "#34d399", "#2dd4bf", "#2dd4bf", "#a3e635"];

function convertAmount(amountInUzs: number, rate: number) {
  if (rate <= 0) {
    return 0;
  }

  return Number((amountInUzs / rate).toFixed(2));
}

function formatAmount(value: number) {
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function buildPieGradient(values: Array<{ share: number; color: string }>) {
  if (values.length === 0) {
    return "";
  }

  let cursor = 0;
  const segments: string[] = [];

  for (const [index, item] of values.entries()) {
    const start = cursor;
    const end = index === values.length - 1 ? 100 : Math.min(100, cursor + item.share);
    if (end > start) {
      segments.push(`${item.color} ${start}% ${end}%`);
    }
    cursor = end;
  }

  return segments.join(", ");
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
    : "border-[rgba(79,70,229,0.2)] bg-[color-mix(in_srgb,rgba(79,70,229,0.12),transparent)] text-[rgb(79,70,229)]";
}

export function DashboardBreakdownPanel({ charts, displayCurrency, rates, kind }: DashboardBreakdownPanelProps) {
  const [valueMode, setValueMode] = useState<BreakdownValueMode>("ABSOLUTE");

  const displayRate = rates[displayCurrency];
  const displayTotal = useMemo(() => {
    return charts.breakdown.items.reduce((sum, item) => sum + convertAmount(getBreakdownAmount(item), displayRate), 0);
  }, [charts.breakdown.items, displayRate]);

  const breakdownItems = useMemo(
    () =>
      charts.breakdown.items.map((item, index) => {
        const amountInUzs = getBreakdownAmount(item);
        const itemKind = getBreakdownKind(item, kind);
        const displayAmount = convertAmount(amountInUzs, displayRate);

        return {
          ...item,
          amountInUzs,
          displayAmount,
          itemKind,
          color: getColor(itemKind, index)
        };
      }),
    [charts.breakdown.items, displayRate, kind]
  );
  const breakdownPieSlices = breakdownItems.map((item) => ({ share: item.share, color: item.color }));
  const breakdownPieGradient = buildPieGradient(breakdownPieSlices);

  return (
    <section className="mb-6 grid w-full min-w-0 gap-4">
      <Card className="panel-soft w-full min-w-0 overflow-hidden">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Transactions breakdown</CardTitle>
              <CardDescription>Pie view for the current mix. Colors follow transaction kind, and value mode changes between absolute amounts and shares.</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <SegmentedControl
                ariaLabel="Breakdown value mode"
                value={valueMode}
                onChange={(next) => setValueMode(next)}
                options={[
                  { value: "ABSOLUTE", label: "Absolute" },
                  { value: "PERCENT", label: "Percent" }
                ]}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="min-w-0">
          {breakdownItems.length === 0 ? (
            <p className="body-muted text-sm">No transactions match this filter set.</p>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,240px)_minmax(0,1fr)] lg:items-center">
              <div className="mx-auto flex h-[220px] w-[220px] items-center justify-center rounded-full border border-white/10 bg-[color-mix(in_srgb,var(--gold)_6%,transparent)] p-4">
                <div
                  className="relative flex h-full w-full items-center justify-center rounded-full"
                  style={{
                    background: breakdownPieGradient ? `conic-gradient(${breakdownPieGradient})` : undefined
                  }}
                >
                  <div className="flex h-[120px] w-[120px] flex-col items-center justify-center rounded-full border border-white/10 bg-[color-mix(in_srgb,var(--bg-base)_92%,transparent)] text-center shadow-[0_10px_24px_rgba(0,0,0,0.08)]">
                    <p className="text-xs uppercase tracking-[0.16em] text-[var(--ink-soft)]">Total</p>
                    <p className="mt-1 text-lg font-semibold">{valueMode === "ABSOLUTE" ? `${formatAmount(displayTotal)} ${displayCurrency}` : "100%"}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                {breakdownItems.map((item) => (
                  <div key={item.categoryId} className="detail-box flex items-center justify-between gap-3 px-3 py-2 text-sm">
                    <div className="flex items-center gap-3">
                      <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <div>
                        <p className="font-medium">{item.categoryName}</p>
                        <p className="body-muted text-xs">{formatAmount(item.share)}% of filtered total</p>
                        <p className={`mt-1 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] ${kindPillClass(item.itemKind)}`}>
                          {kindLabel(item.itemKind)}
                        </p>
                      </div>
                    </div>
                    <p className="font-semibold">
                      {valueMode === "ABSOLUTE" ? `${formatAmount(item.displayAmount)} ${displayCurrency}` : `${formatAmount(item.share)}%`}
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
