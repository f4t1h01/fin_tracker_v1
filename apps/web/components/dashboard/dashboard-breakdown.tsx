import { useMemo, useState } from "react";

import type { DashboardKind, DashboardResponse, SupportedCurrency } from "@/components/profile/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SegmentedControl } from "@/components/ui/segmented-control";

type BreakdownValueMode = "ABSOLUTE" | "PERCENT";

type DashboardBreakdownPanelProps = {
  charts: DashboardResponse["charts"];
  displayCurrency: SupportedCurrency;
  rates: Record<SupportedCurrency, number>;
  kind: DashboardKind;
};

const expenseColors = ["#f43f5e", "#fb7185", "#e11d48", "#be123c", "#f87171", "#ef4444", "#dc2626", "#fda4af"];
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

function getBreakdownKind(item: DashboardResponse["charts"]["breakdown"]["items"][number], fallbackKind: DashboardKind): "EXPENSE" | "INCOME" {
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
  const breakdownPieGradient = buildPieGradient(breakdownItems.map((item) => ({ share: item.share, color: item.color })));

  return (
    <section className="mb-6 grid w-full min-w-0 gap-4">
      <Card className="panel-soft w-full min-w-0 overflow-hidden">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <CardTitle>Breakdown</CardTitle>
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
        </CardHeader>
        <CardContent className="min-w-0">
          {breakdownItems.length === 0 ? (
            <p className="body-muted text-sm">No transactions match this filter set.</p>
          ) : (
            <div className="space-y-5">
              <div className="detail-box flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                <p className="field-label">Total</p>
                <p className="text-lg font-semibold tabular-nums">{`${formatAmount(displayTotal)} ${displayCurrency}`}</p>
              </div>
              <div className="grid gap-6 lg:grid-cols-[minmax(0,240px)_minmax(0,1fr)] lg:items-center">
                <div className="mx-auto flex h-[220px] w-[220px] items-center justify-center rounded-full border border-white/10 bg-[color-mix(in_srgb,var(--gold)_6%,transparent)] p-4">
                  <div
                    className="relative flex h-full w-full items-center justify-center rounded-full"
                    style={{
                      background: breakdownPieGradient ? `conic-gradient(${breakdownPieGradient})` : undefined
                    }}
                  >
                    <div className="flex h-[120px] w-[120px] flex-col items-center justify-center rounded-full border border-white/10 bg-[color-mix(in_srgb,var(--bg-base)_92%,transparent)] text-center shadow-[0_10px_24px_rgba(0,0,0,0.08)]">
                      <p className="text-sm font-medium text-[var(--ink-strong)]">By category</p>
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
                          <p className="body-muted text-xs">{formatAmount(item.share)}%</p>
                        </div>
                      </div>
                      <p className="font-semibold">{valueMode === "ABSOLUTE" ? `${formatAmount(item.displayAmount)} ${displayCurrency}` : `${formatAmount(item.share)}%`}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
