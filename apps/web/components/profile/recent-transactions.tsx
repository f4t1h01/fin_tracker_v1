import { Pencil, Trash2, WalletCards, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { type EditableTransaction, type RecentTransaction, supportedCurrencies, type SupportedCurrency } from "./types";

type RecentTransactionsProps = {
  recent: RecentTransaction[];
  isLoadingData: boolean;
  isDeletingId: string | null;
  editingTransaction: EditableTransaction | null;
  setEditingTransaction: (value: EditableTransaction | null) => void;
  isSavingEdit: boolean;
  onStartEditing: (item: RecentTransaction) => void;
  onSaveEdit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  onDeleteTransaction: (transactionId: string) => Promise<void>;
};

export function RecentTransactions(props: RecentTransactionsProps) {
  return (
    <>
      <section className="mt-6">
        <Card className="panel-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><WalletCards className="size-5 text-pop" />Recent activity</CardTitle>
            <CardDescription>Latest 20 transactions from your active workspace.</CardDescription>
          </CardHeader>
          <CardContent>
            {props.isLoadingData ? (
              <p className="body-muted text-sm">Refreshing...</p>
            ) : props.recent.length === 0 ? (
              <p className="body-muted text-sm">No transactions yet.</p>
            ) : (
              <div className="space-y-2">
                {props.recent.map((item) => {
                  const amountNumber = Number(item.amount);
                  const amountClass = item.kind === "INCOME" ? "text-emerald-700 dark:text-emerald-200" : "text-rose-700 dark:text-rose-200";
                  const actor = item.user.firstName ?? item.user.username ?? "Member";
                  return (
                    <div key={item.id} className="detail-box px-3 py-3 text-sm">
                      <div>
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-medium">{item.category.name}</p>
                          <p className={`font-semibold ${amountClass}`}>{item.kind === "INCOME" ? "+" : "-"}{amountNumber.toLocaleString()} {item.currency}</p>
                        </div>
                        <p className="body-muted text-xs">{actor} - {item.note ?? "No note"} - {new Date(item.happenedAt).toLocaleString()}</p>
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <Button type="button" size="sm" variant="outline" onClick={() => props.onStartEditing(item)}><Pencil className="size-3.5" />Edit</Button>
                        <Button type="button" size="sm" variant="ghost" disabled={props.isDeletingId === item.id} onClick={() => void props.onDeleteTransaction(item.id)}><Trash2 className="size-3.5" />{props.isDeletingId === item.id ? "Deleting..." : "Delete"}</Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {props.editingTransaction ? (
        <section className="mt-6">
          <Card className="panel-soft">
            <CardHeader><CardTitle className="flex items-center gap-2"><Pencil className="size-5 text-pop" />Edit transaction</CardTitle><CardDescription>Adjust only your own saved transaction.</CardDescription></CardHeader>
            <CardContent>
              <form className="space-y-3" onSubmit={props.onSaveEdit}>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <label className="space-y-1 text-sm"><span className="field-label">Type</span><select value={props.editingTransaction.kind} onChange={(event) => props.setEditingTransaction({ ...props.editingTransaction!, kind: event.target.value as "EXPENSE" | "INCOME" })} className="form-select"><option value="EXPENSE">Expense</option><option value="INCOME">Income</option></select></label>
                  <label className="space-y-1 text-sm"><span className="field-label">Amount</span><input required inputMode="decimal" min="0.01" step="0.01" value={props.editingTransaction.amount} onChange={(event) => props.setEditingTransaction({ ...props.editingTransaction!, amount: event.target.value })} className="form-input" /></label>
                  <label className="space-y-1 text-sm"><span className="field-label">Currency</span><select value={props.editingTransaction.currency} onChange={(event) => props.setEditingTransaction({ ...props.editingTransaction!, currency: event.target.value as SupportedCurrency })} className="form-select">{supportedCurrencies.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
                </div>
                <label className="space-y-1 text-sm"><span className="field-label">Category</span><input required value={props.editingTransaction.categoryName} onChange={(event) => props.setEditingTransaction({ ...props.editingTransaction!, categoryName: event.target.value })} className="form-input" /></label>
                <label className="space-y-1 text-sm"><span className="field-label">Note</span><input value={props.editingTransaction.note} onChange={(event) => props.setEditingTransaction({ ...props.editingTransaction!, note: event.target.value })} className="form-input" /></label>
                <div className="flex items-center gap-3"><Button type="submit" disabled={props.isSavingEdit}>{props.isSavingEdit ? "Saving..." : "Save changes"}</Button><Button type="button" variant="outline" onClick={() => props.setEditingTransaction(null)}><X className="size-4" />Cancel</Button></div>
              </form>
            </CardContent>
          </Card>
        </section>
      ) : null}
    </>
  );
}
