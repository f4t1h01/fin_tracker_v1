import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { type DashboardResponse, type SupportedCurrency } from "@/components/profile/types";

type DashboardRecentsProps = {
  recent: DashboardResponse["recent"];
  displayCurrency: SupportedCurrency;
  rates: Record<SupportedCurrency, number>;
};

function convertAmount(amountInUzs: number, rate: number) {
  if (rate <= 0) {
    return 0;
  }

  return Number((amountInUzs / rate).toFixed(2));
}

export function DashboardRecents({ recent, displayCurrency, rates }: DashboardRecentsProps) {
  return (
    <Card className="panel-soft">
      <CardHeader>
        <CardTitle>Recent activity</CardTitle>
        <CardDescription>Stored in original currency, displayed here in your selected dashboard currency.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {recent.map((item) => {
          const actor = item.user.firstName ?? item.user.username ?? "Member";
          const converted = convertAmount(Number(item.amountInUzs), rates[displayCurrency]);
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
      </CardContent>
    </Card>
  );
}
