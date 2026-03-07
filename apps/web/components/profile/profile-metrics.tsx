import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { type MonthlySummary } from "./types";

type ProfileMetricsProps = {
  summary: MonthlySummary | null;
};

export function ProfileMetrics({ summary }: ProfileMetricsProps) {
  return (
    <section className="mb-6 grid gap-4 md:grid-cols-3">
      <Card className="metric-income"><CardHeader><CardTitle>Income</CardTitle></CardHeader><CardContent className="text-2xl font-semibold text-emerald-700 dark:text-emerald-200">{summary ? `${summary.totalIncome.toLocaleString()} ${summary.currency}` : "-"}</CardContent></Card>
      <Card className="metric-expense"><CardHeader><CardTitle>Expense</CardTitle></CardHeader><CardContent className="text-2xl font-semibold text-rose-700 dark:text-rose-200">{summary ? `${summary.totalExpense.toLocaleString()} ${summary.currency}` : "-"}</CardContent></Card>
      <Card className="metric-balance"><CardHeader><CardTitle>Balance</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{summary ? `${summary.balance.toLocaleString()} ${summary.currency}` : "-"}</CardContent></Card>
    </section>
  );
}
