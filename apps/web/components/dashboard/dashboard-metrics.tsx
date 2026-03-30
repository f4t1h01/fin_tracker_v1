import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
        <Card className="metric-income">
          <CardHeader className="pb-2">
            <CardTitle className="text-[22px]">Income</CardTitle>
            <CardDescription>Income in the current filter range.</CardDescription>
          </CardHeader>
          <CardContent className="pt-0 text-[clamp(28px,2.6vw,38px)] font-semibold text-emerald-700 dark:text-emerald-200">
            {totalIncome.toLocaleString()} {currency}
          </CardContent>
        </Card>
        <Card className="metric-expense">
          <CardHeader className="pb-2">
            <CardTitle className="text-[22px]">Expense</CardTitle>
            <CardDescription>Expense in the current filter range.</CardDescription>
          </CardHeader>
          <CardContent className="pt-0 text-[clamp(28px,2.6vw,38px)] font-semibold text-rose-700 dark:text-rose-200">
            {totalExpense.toLocaleString()} {currency}
          </CardContent>
        </Card>
        <Card className="metric-balance">
          <CardHeader className="pb-2">
            <CardTitle className="text-[22px]">Balance</CardTitle>
            <CardDescription>Net result inside the selected view.</CardDescription>
          </CardHeader>
          <CardContent className="pt-0 text-[clamp(28px,2.6vw,38px)] font-semibold">
            {balance.toLocaleString()} {currency}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
