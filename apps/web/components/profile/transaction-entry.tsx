import { PlusCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { supportedCurrencies, type SupportedCurrency } from "./types";

type TransactionEntryProps = {
  workspaceName: string;
  kind: "EXPENSE" | "INCOME";
  setKind: (value: "EXPENSE" | "INCOME") => void;
  amount: string;
  setAmount: (value: string) => void;
  currency: SupportedCurrency;
  setCurrency: (value: SupportedCurrency) => void;
  categoryName: string;
  setCategoryName: (value: string) => void;
  note: string;
  setNote: (value: string) => void;
  txMessage: string | null;
  txError: string | null;
  isSubmittingTx: boolean;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
};

export function TransactionEntry(props: TransactionEntryProps) {
  return (
    <Card className="panel-soft">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><PlusCircle className="size-5 text-pop" />Add income or expense</CardTitle>
        <CardDescription>Transactions are saved to your active couple workspace: {props.workspaceName}</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-3" onSubmit={props.onSubmit}>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <label className="space-y-1 text-sm"><span className="field-label">Type</span><select value={props.kind} onChange={(event) => props.setKind(event.target.value as "EXPENSE" | "INCOME")} className="form-select"><option value="EXPENSE">Expense</option><option value="INCOME">Income</option></select></label>
            <label className="space-y-1 text-sm"><span className="field-label">Amount</span><input required inputMode="decimal" min="0.01" step="0.01" value={props.amount} onChange={(event) => props.setAmount(event.target.value)} placeholder="45000" className="form-input" /></label>
            <label className="space-y-1 text-sm"><span className="field-label">Currency</span><select value={props.currency} onChange={(event) => props.setCurrency(event.target.value as SupportedCurrency)} className="form-select">{supportedCurrencies.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          </div>
          <label className="space-y-1 text-sm"><span className="field-label">Category</span><input required value={props.categoryName} onChange={(event) => props.setCategoryName(event.target.value)} placeholder="groceries / salary" className="form-input" /></label>
          <label className="space-y-1 text-sm"><span className="field-label">Note (optional)</span><input value={props.note} onChange={(event) => props.setNote(event.target.value)} placeholder="short context" className="form-input" /></label>
          <div className="flex flex-wrap items-center gap-3"><Button type="submit" disabled={props.isSubmittingTx}>{props.isSubmittingTx ? "Saving..." : "Save transaction"}</Button>{props.txMessage ? <p className="status-success text-sm">{props.txMessage}</p> : null}{props.txError ? <p className="status-error text-sm">{props.txError}</p> : null}</div>
        </form>
      </CardContent>
    </Card>
  );
}
