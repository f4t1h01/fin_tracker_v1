import { Pencil, WalletCards, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";

import { buildCategoryOptions } from "./category-options";
import { RecentTransactionRow } from "./recent-transaction-row";
import { type CategoryCatalogResponse, type EditableTransaction, type RecentTransaction, supportedCurrencies, type SupportedCurrency } from "./types";

type RecentTransactionsProps = {
  recent: RecentTransaction[];
  isLoadingData: boolean;
  isDeletingId: string | null;
  editingTransaction: EditableTransaction | null;
  categoryCatalog: CategoryCatalogResponse | null;
  setEditingTransaction: (value: EditableTransaction | null) => void;
  isSavingEdit: boolean;
  onStartEditing: (item: RecentTransaction) => void;
  onSaveEdit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  onDeleteTransaction: (transactionId: string) => Promise<void>;
};

export function RecentTransactions(props: RecentTransactionsProps) {
  const editOptions = props.editingTransaction ? buildCategoryOptions(props.categoryCatalog, props.editingTransaction.kind, { forceIncludeShared: true }) : null;

  return (
    <>
      <section className="mt-6">
        <Card className="panel-soft">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2"><WalletCards className="size-5 text-pop" />Recent activity</CardTitle>
              {props.isLoadingData && props.recent.length > 0 ? <span className="body-muted text-xs uppercase tracking-[0.16em]">Refreshing</span> : null}
            </div>
            <CardDescription>Latest 20 transactions from your active workspace.</CardDescription>
          </CardHeader>
          <CardContent>
            {props.isLoadingData && props.recent.length === 0 ? (
              <p className="body-muted text-sm">Refreshing...</p>
            ) : props.recent.length === 0 ? (
              <p className="body-muted text-sm">No transactions yet.</p>
            ) : (
              <div className="space-y-2">
                {props.recent.map((item) => <RecentTransactionRow key={item.id} item={item} isDeleting={props.isDeletingId === item.id} onStartEditing={props.onStartEditing} onDeleteTransaction={props.onDeleteTransaction} />)}
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
                  <label className="space-y-1 text-sm"><span className="field-label">Type</span><SelectField value={props.editingTransaction.kind} onChange={(event) => props.setEditingTransaction({ ...props.editingTransaction!, kind: event.target.value as "EXPENSE" | "INCOME" })}><option value="EXPENSE">Expense</option><option value="INCOME">Income</option></SelectField></label>
                  <label className="space-y-1 text-sm"><span className="field-label">Amount</span><TextField required inputMode="decimal" min="0.01" step="0.01" value={props.editingTransaction.amount} onChange={(event) => props.setEditingTransaction({ ...props.editingTransaction!, amount: event.target.value })} /></label>
                  <label className="space-y-1 text-sm"><span className="field-label">Currency</span><SelectField value={props.editingTransaction.currency} onChange={(event) => props.setEditingTransaction({ ...props.editingTransaction!, currency: event.target.value as SupportedCurrency })}>{supportedCurrencies.map((item) => <option key={item} value={item}>{item}</option>)}</SelectField></label>
                </div>
                <label className="space-y-1 text-sm">
                  <span className="field-label">Category</span>
                  <SelectField value={props.editingTransaction.categoryId} onChange={(event) => props.setEditingTransaction({ ...props.editingTransaction!, categoryId: event.target.value })}>
                    <option value="">Choose a category</option>
                    {editOptions?.personal.length ? <optgroup label="My categories">{editOptions.personal.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</optgroup> : null}
                    {editOptions?.shared.length ? <optgroup label="Shared categories">{editOptions.shared.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</optgroup> : null}
                  </SelectField>
                </label>
                <label className="space-y-1 text-sm"><span className="field-label">Note</span><TextField value={props.editingTransaction.note} onChange={(event) => props.setEditingTransaction({ ...props.editingTransaction!, note: event.target.value })} /></label>
                <div className="flex items-center gap-3"><Button type="submit" disabled={props.isSavingEdit} pending={props.isSavingEdit} pendingText="Saving...">Save changes</Button><Button type="button" variant="outline" onClick={() => props.setEditingTransaction(null)}><X className="size-4" />Cancel</Button></div>
              </form>
            </CardContent>
          </Card>
        </section>
      ) : null}
    </>
  );
}
