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
      </div>
      {hasPartnerConnection && summary ? (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="metric-balance">
            <CardHeader>
              <CardTitle>Your balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{balanceLabel}</div>
            </CardContent>
          </Card>
          <Card className="metric-balance">
            <CardHeader>
              <CardTitle>Partner balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{partnerBalance !== null ? formatBalance(partnerBalance, summary.currency) : "-"}</div>
            </CardContent>
          </Card>
          <Card className="metric-balance">
            <CardHeader>
              <CardTitle>Total couple balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{totalBalance !== null ? formatBalance(totalBalance, summary.currency) : "-"}</div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="metric-balance">
          <CardHeader>
            <CardTitle>Your balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{balanceLabel}</div>
            <p className="body-muted mt-2 text-sm">This card stays personal until you connect a partner.</p>
          </CardContent>
        </Card>
      )}
    </section>
  );
}
