import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type DashboardMetricsProps = {
  heading: string;
  totalIncome: number;
  totalExpense: number;
  balance: number;
  currency: string;
};

export function DashboardMetrics({ heading, totalIncome, totalExpense, balance, currency }: DashboardMetricsProps) {
  return (
    <section className="mb-6 space-y-4">
      <p className="eyebrow-row">{heading}</p>
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="metric-income">
          <CardHeader className="pb-2">
            <CardTitle className="text-[22px]">Income</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-[clamp(28px,2.6vw,38px)] font-semibold text-emerald-700 dark:text-emerald-200">
            {totalIncome.toLocaleString()} {currency}
          </CardContent>
        </Card>
        <Card className="metric-expense">
          <CardHeader className="pb-2">
            <CardTitle className="text-[22px]">Expense</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-[clamp(28px,2.6vw,38px)] font-semibold text-rose-700 dark:text-rose-200">
            {totalExpense.toLocaleString()} {currency}
          </CardContent>
        </Card>
        <Card className="metric-balance">
          <CardHeader className="pb-2">
            <CardTitle className="text-[22px]">Balance</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-[clamp(28px,2.6vw,38px)] font-semibold">
            {balance.toLocaleString()} {currency}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
