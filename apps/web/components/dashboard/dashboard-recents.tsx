import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { type DashboardResponse, type SupportedCurrency } from "@/components/profile/types";

type DashboardRecentsProps = {
  transactions: DashboardResponse["transactions"];
  displayCurrency: SupportedCurrency;
  rates: Record<SupportedCurrency, number>;
  onPageChange: (value: number) => void;
};

function convertAmount(amountInUzs: number, rate: number) {
  if (rate <= 0) {
    return 0;
  }

  return Number((amountInUzs / rate).toFixed(2));
}

export function DashboardRecents({ transactions, displayCurrency, rates, onPageChange }: DashboardRecentsProps) {
  const rate = rates[displayCurrency];
  return (
    <Card className="panel-soft">
      <CardHeader>
        <CardTitle>Transactions</CardTitle>
        <CardDescription>Paginated activity slice for the current filter set. Stored in original currency, displayed here in your selected dashboard currency.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {transactions.items.length === 0 ? (
          <p className="body-muted text-sm">No transactions match the current filters.</p>
        ) : (
          <div className="space-y-2">
            {transactions.items.map((item) => {
          const actor = item.user.firstName ?? item.user.username ?? "Member";
          const converted = convertAmount(Number(item.amountInUzs), rate);
          return (
            <div key={item.id} className="detail-box px-3 py-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{item.category.name}</p>
                  <p className="body-muted text-xs">{actor} - {item.note ?? "No note"} - {new Date(item.happenedAt).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{converted.toLocaleString()} {displayCurrency}</p>
                  <p className="body-muted text-xs">Original: {Number(item.amount).toLocaleString()} {item.currency}</p>
                </div>
              </div>
            </div>
          );
            })}
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-3 text-sm">
          <p className="body-muted">
            Page {transactions.page} of {transactions.totalPages} · {transactions.totalItems} transactions
          </p>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" disabled={transactions.page <= 1} onClick={() => onPageChange(Math.max(1, transactions.page - 1))}>Previous</Button>
            <Button type="button" variant="outline" disabled={transactions.page >= transactions.totalPages} onClick={() => onPageChange(Math.min(transactions.totalPages, transactions.page + 1))}>Next</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
