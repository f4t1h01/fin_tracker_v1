import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
      <div className="space-y-1">
        <p className="eyebrow-row">{hasPartnerConnection ? "Couple balances" : "Personal balance"}</p>
        <p className="body-muted text-sm">
          {hasPartnerConnection ? "Shared workspace totals are split into your part, your partner's part, and the total couple balance." : "No partner is linked, so these numbers reflect only your personal workspace."}
        </p>
        <p className="body-muted text-xs uppercase tracking-[0.16em]">{formatMonthLabel(summary)}</p>
      </div>
      {hasPartnerConnection && summary ? (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="metric-balance">
            <CardHeader className="pb-2">
              <CardTitle className="text-[22px]">Your balance</CardTitle>
              <CardDescription>Your personal share in the current month.</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-[clamp(28px,2.6vw,38px)] font-semibold">{balanceLabel}</div>
            </CardContent>
          </Card>
          <Card className="metric-balance">
            <CardHeader className="pb-2">
              <CardTitle className="text-[22px]">Partner balance</CardTitle>
              <CardDescription>Your partner's share in the current month.</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-[clamp(28px,2.6vw,38px)] font-semibold">{partnerBalance !== null ? formatBalance(partnerBalance, summary.currency) : "-"}</div>
            </CardContent>
          </Card>
          <Card className="metric-balance">
            <CardHeader className="pb-2">
              <CardTitle className="text-[22px]">Total couple balance</CardTitle>
              <CardDescription>Combined workspace balance for the month.</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-[clamp(28px,2.6vw,38px)] font-semibold">{totalBalance !== null ? formatBalance(totalBalance, summary.currency) : "-"}</div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="metric-balance">
          <CardHeader className="pb-2">
            <CardTitle className="text-[22px]">Your balance</CardTitle>
            <CardDescription>Current month snapshot for your personal workspace.</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-[clamp(28px,2.6vw,38px)] font-semibold">{balanceLabel}</div>
            <p className="body-muted mt-2 text-sm">This card stays personal until you connect a partner.</p>
          </CardContent>
        </Card>
      )}
    </section>
  );
}
