import { Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";

import { type RecentTransaction, type SupportedCurrency } from "./types";

type RecentTransactionRowProps = {
  item: RecentTransaction;
  isDeleting: boolean;
  onStartEditing: (item: RecentTransaction) => void;
  onDeleteTransaction: (transactionId: string) => Promise<void>;
  displayCurrency?: SupportedCurrency;
  rates?: Record<SupportedCurrency, number>;
};

function convertAmount(amountInUzs: number, rate: number) {
  if (rate <= 0) {
    return 0;
  }

  return Number((amountInUzs / rate).toFixed(2));
}

export function RecentTransactionRow(props: RecentTransactionRowProps) {
  const amountNumber = props.displayCurrency && props.rates ? convertAmount(Number(props.item.amountInUzs), props.rates[props.displayCurrency]) : Number(props.item.amount);
  const amountClass = props.item.kind === "INCOME" ? "text-emerald-700 dark:text-emerald-200" : "text-rose-700 dark:text-rose-200";
  const actor = props.item.user.firstName ?? props.item.user.username ?? "Member";
  const originalAmount = Number(props.item.amount);

  return (
    <div className="detail-box px-3 py-3 text-sm">
      <div>
        <div className="flex items-center justify-between gap-3">
          <p className="font-medium">{props.item.category.name}</p>
          <p className={`font-semibold ${amountClass}`}>{props.item.kind === "INCOME" ? "+" : "-"}{amountNumber.toLocaleString()} {props.displayCurrency ?? props.item.currency}</p>
        </div>
        <p className="body-muted break-words text-xs">
          {actor} - {props.item.note ?? "No note"} - {new Date(props.item.happenedAt).toLocaleString()}
          {props.displayCurrency && props.rates ? ` · Original: ${originalAmount.toLocaleString()} ${props.item.currency}` : ""}
        </p>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <Button type="button" size="sm" variant="outline" onClick={() => props.onStartEditing(props.item)}><Pencil className="size-3.5" />Edit</Button>
        <Button type="button" size="sm" variant="ghost" disabled={props.isDeleting} pending={props.isDeleting} pendingText={<><Trash2 className="size-3.5" />Deleting...</>} onClick={() => void props.onDeleteTransaction(props.item.id)}><Trash2 className="size-3.5" />Delete</Button>
      </div>
    </div>
  );
}
