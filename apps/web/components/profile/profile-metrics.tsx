import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { type MonthlySummary } from "./types";

type ProfileMetricsProps = {
  summary: MonthlySummary | null;
};

export function ProfileMetrics({ summary }: ProfileMetricsProps) {
  const balanceLabel = typeof summary?.personalBalance === "number" ? `${summary.personalBalance.toLocaleString()} ${summary.currency}` : "-";

  return (
    <section className="mb-6">
      <Card className="metric-balance">
        <CardHeader>
          <CardTitle>Your balance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-semibold">{balanceLabel}</div>
          <p className="body-muted mt-2 text-sm">This card stays personal, even when you are connected to a partner workspace.</p>
        </CardContent>
      </Card>
    </section>
  );
}
