import { PlusCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";

import { buildCategoryOptions } from "./category-options";
import { supportedCurrencies, type CategoryCatalogResponse, type SupportedCurrency } from "./types";

type TransactionEntryProps = {
  workspaceName: string;
  kind: "EXPENSE" | "INCOME";
  setKind: (value: "EXPENSE" | "INCOME") => void;
  amount: string;
  setAmount: (value: string) => void;
  currency: SupportedCurrency;
  setCurrency: (value: SupportedCurrency) => void;
  categoryCatalog: CategoryCatalogResponse | null;
  selectedCategoryId: string;
  setSelectedCategoryId: (value: string) => void;
  note: string;
  setNote: (value: string) => void;
  txMessage: string | null;
  txError: string | null;
  isSubmittingTx: boolean;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
};

export function TransactionEntry(props: TransactionEntryProps) {
  const options = buildCategoryOptions(props.categoryCatalog, props.kind);

  return (
    <Card className="panel-soft">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><PlusCircle className="size-5 text-pop" />Add income or expense</CardTitle>
        <CardDescription>Transactions are saved to your active couple workspace: {props.workspaceName}</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-3" onSubmit={props.onSubmit}>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <label className="space-y-1 text-sm"><span className="field-label">Type</span><SelectField value={props.kind} onChange={(event) => props.setKind(event.target.value as "EXPENSE" | "INCOME")}><option value="EXPENSE">Expense</option><option value="INCOME">Income</option></SelectField></label>
            <label className="space-y-1 text-sm"><span className="field-label">Amount</span><TextField required inputMode="decimal" min="0.01" step="0.01" value={props.amount} onChange={(event) => props.setAmount(event.target.value)} placeholder="45000" /></label>
            <label className="space-y-1 text-sm"><span className="field-label">Currency</span><SelectField value={props.currency} onChange={(event) => props.setCurrency(event.target.value as SupportedCurrency)}>{supportedCurrencies.map((item) => <option key={item} value={item}>{item}</option>)}</SelectField></label>
          </div>
          <label className="space-y-1 text-sm">
            <span className="field-label">Category</span>
            <SelectField required value={props.selectedCategoryId} onChange={(event) => props.setSelectedCategoryId(event.target.value)}>
              <option value="">Choose a category</option>
              {options.personal.length > 0 ? (
                <optgroup label="My categories">
                  {options.personal.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                </optgroup>
              ) : null}
              {options.shared.length > 0 ? (
                <optgroup label="Shared categories">
                  {options.shared.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                </optgroup>
              ) : null}
            </SelectField>
          </label>
          <label className="space-y-1 text-sm"><span className="field-label">Note (optional)</span><TextField value={props.note} onChange={(event) => props.setNote(event.target.value)} placeholder="short context" /></label>
          <div className="flex flex-wrap items-center gap-3"><Button type="submit" disabled={props.isSubmittingTx} pending={props.isSubmittingTx} pendingText="Saving...">Save transaction</Button>{props.txMessage ? <p className="status-success text-sm">{props.txMessage}</p> : null}{props.txError ? <p className="status-error text-sm">{props.txError}</p> : null}</div>
        </form>
      </CardContent>
    </Card>
  );
}
