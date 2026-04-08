import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { type MonthlySummary } from "./types";

type ProfileMetricsProps = {
  summary: MonthlySummary | null;
  hasPartnerConnection: boolean;
};

function formatBalance(value: number, currency: string) {
  const formatted = `${Math.abs(value).toLocaleString()} ${currency}`;
  return value < 0 ? `-${formatted}` : formatted;
}

function formatMonthLabel(summary: MonthlySummary | null) {
  if (!summary) {
    return "This month";
  }

  const value = new Date(Date.UTC(summary.year, summary.month - 1, 1));
  return value.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

export function ProfileMetrics({ summary, hasPartnerConnection }: ProfileMetricsProps) {
  const balanceLabel = typeof summary?.personalBalance === "number" ? `${summary.personalBalance.toLocaleString()} ${summary.currency}` : "-";
  const totalBalance = typeof summary?.balance === "number" ? summary.balance : null;
  const partnerBalance = totalBalance !== null && typeof summary?.personalBalance === "number" ? totalBalance - summary.personalBalance : null;

  return (
    <section className="mb-6 space-y-4">
      <p className="eyebrow-row">{formatMonthLabel(summary)}</p>
      {hasPartnerConnection && summary ? (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="metric-balance">
            <CardHeader className="pb-2">
              <CardTitle className="text-[22px]">Your balance</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-[clamp(28px,2.6vw,38px)] font-semibold">{balanceLabel}</div>
            </CardContent>
          </Card>
          <Card className="metric-balance">
            <CardHeader className="pb-2">
              <CardTitle className="text-[22px]">Partner balance</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-[clamp(28px,2.6vw,38px)] font-semibold">{partnerBalance !== null ? formatBalance(partnerBalance, summary.currency) : "-"}</div>
            </CardContent>
          </Card>
          <Card className="metric-balance">
            <CardHeader className="pb-2">
              <CardTitle className="text-[22px]">Total couple balance</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-[clamp(28px,2.6vw,38px)] font-semibold">{totalBalance !== null ? formatBalance(totalBalance, summary.currency) : "-"}</div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </section>
  );
}
