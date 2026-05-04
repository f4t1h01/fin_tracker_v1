import { ArrowRight, PlusCircle } from "lucide-react";

import { AppLink } from "@/components/navigation/app-link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import { cn } from "@/lib/cn";

import { formatAmountInputValue, normalizeAmountInput } from "./amount-format";
import { buildCategoryOptions } from "./category-options";
import type { CategoryCatalogResponse, SupportedCurrency } from "./types";

type TransactionEntryProps = {
  workspaceName: string;
  kind: "EXPENSE" | "INCOME";
  setKind: (value: "EXPENSE" | "INCOME") => void;
  amount: string;
  setAmount: (value: string) => void;
  currency: SupportedCurrency;
  setCurrency: (value: SupportedCurrency) => void;
  currencyOptions: readonly SupportedCurrency[];
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
  const allCategoryOptions = [...options.personal, ...options.shared];
  const selectedCategoryIsVisible = Boolean(
    props.selectedCategoryId && allCategoryOptions.some((item) => item.id === props.selectedCategoryId)
  );
  const isSubmittableControl = (
    element: Element
  ): element is HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement =>
    element instanceof HTMLInputElement ||
    element instanceof HTMLSelectElement ||
    element instanceof HTMLTextAreaElement;
  const reportInvalid = (event: React.FormEvent<HTMLFormElement>) => {
    const form = event.currentTarget;
    const invalid = Array.from(form.elements)
      .filter((element): element is HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement => isSubmittableControl(element) && !element.validity.valid)
      .map((element) => ({
        name: element.getAttribute("name") ?? element.getAttribute("aria-label") ?? element.id ?? element.tagName,
        validationMessage: element.validationMessage
      }));

    console.warn("[transaction:create] native validation blocked submit", { invalid });
  };

  return (
    <Card className="panel-soft">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PlusCircle className="size-5 text-pop" />
          Add transaction
        </CardTitle>
        <CardDescription>Workspace: {props.workspaceName}</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={props.onSubmit} onInvalid={reportInvalid}>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
            <div className="space-y-1 text-sm md:col-span-6">
              <span className="field-label">Type</span>
              <div className="tx-kind-toggle">
                <button
                  type="button"
                  className={cn("tx-kind-button", props.kind === "EXPENSE" ? "tx-kind-button--expense-active" : "tx-kind-button--inactive")}
                  aria-pressed={props.kind === "EXPENSE"}
                  onClick={() => props.setKind("EXPENSE")}
                >
                  Expense
                </button>
                <button
                  type="button"
                  className={cn("tx-kind-button", props.kind === "INCOME" ? "tx-kind-button--income-active" : "tx-kind-button--inactive")}
                  aria-pressed={props.kind === "INCOME"}
                  onClick={() => props.setKind("INCOME")}
                >
                  Income
                </button>
              </div>
            </div>

            <label className="space-y-1 text-sm md:col-span-2">
              <span className="field-label">Amount</span>
              <TextField
                name="amount"
                required
                inputMode="decimal"
                value={formatAmountInputValue(props.amount)}
                onChange={(event) => props.setAmount(normalizeAmountInput(event.target.value))}
                placeholder="45,000"
              />
            </label>

            <label className="space-y-1 text-sm md:col-span-2">
              <span className="field-label">Currency</span>
              <SelectField value={props.currency} onChange={(event) => props.setCurrency(event.target.value as SupportedCurrency)}>
                {props.currencyOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </SelectField>
            </label>

            <label className="space-y-1 text-sm md:col-span-2">
              <span className="field-label">Category</span>
              <SelectField
                required
                name="category"
                value={props.selectedCategoryId}
                onChange={(event) => {
                  props.setSelectedCategoryId(event.target.value);
                }}
              >
                <option value="">Choose a category</option>
                {props.selectedCategoryId && !selectedCategoryIsVisible ? (
                  <option value={props.selectedCategoryId}>Selected by AI</option>
                ) : null}
                {options.personal.length > 0 ? (
                  <optgroup label="My categories">
                    {options.personal.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </optgroup>
                ) : null}
                {options.shared.length > 0 ? (
                  <optgroup label="Shared categories">
                    {options.shared.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </optgroup>
                ) : null}
              </SelectField>
            </label>
          </div>

          <label className="space-y-1 text-sm">
            <span className="field-label">Note</span>
            <TextField value={props.note} onChange={(event) => props.setNote(event.target.value)} placeholder="short context" />
          </label>

          <div className="space-y-3 pt-3">
            <p className="body-muted text-left text-sm">Press if you didn't find a relevant category.</p>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <Button
                type="button"
                asChild
                className="min-h-12 w-full !justify-start px-6 py-4 text-[14px] font-semibold uppercase tracking-[0.14em] md:w-auto md:flex-none"
              >
                <AppLink href="/profile/me/categories">Manage categories</AppLink>
              </Button>
              <Button
                type="submit"
                disabled={props.isSubmittingTx}
                pending={props.isSubmittingTx}
                pendingText="Saving..."
                className="min-h-12 w-full !justify-start px-6 py-4 text-[14px] font-semibold uppercase tracking-[0.14em] md:w-auto md:min-w-[220px] md:flex-none [&>span]:flex [&>span]:w-full [&>span]:items-center [&>span]:gap-2"
              >
                Save transaction
                <ArrowRight className="ml-auto size-4" />
              </Button>
            </div>
            <div className="text-center">
              {props.txMessage ? <p className="status-success text-sm">{props.txMessage}</p> : null}
              {props.txError ? <p className="status-error text-sm">{props.txError}</p> : null}
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
