import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type DashboardMetricsProps = {
  heading: string;
  description: string;
  totalIncome: number;
  totalExpense: number;
  balance: number;
  currency: string;
};

export function DashboardMetrics({ heading, description, totalIncome, totalExpense, balance, currency }: DashboardMetricsProps) {
  return (
    <section className="mb-6 space-y-4">
      <div className="space-y-1">
        <p className="eyebrow-row">{heading}</p>
        <p className="body-muted text-sm">{description}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="metric-income"><CardHeader><CardTitle>Income</CardTitle></CardHeader><CardContent className="text-2xl font-semibold text-emerald-700 dark:text-emerald-200">{totalIncome.toLocaleString()} {currency}</CardContent></Card>
        <Card className="metric-expense"><CardHeader><CardTitle>Expense</CardTitle></CardHeader><CardContent className="text-2xl font-semibold text-rose-700 dark:text-rose-200">{totalExpense.toLocaleString()} {currency}</CardContent></Card>
        <Card className="metric-balance"><CardHeader><CardTitle>Balance</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{balance.toLocaleString()} {currency}</CardContent></Card>
      </div>
    </section>
  );
}
