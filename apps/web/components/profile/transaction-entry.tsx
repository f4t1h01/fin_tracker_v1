import { useState } from "react";

import { PlusCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import { cn } from "@/lib/cn";

import { buildCategoryOptions } from "./category-options";
import { VoiceEntryPanel } from "./voice-entry/voice-entry-panel";
import { supportedCurrencies, type CategoryCatalogResponse, type SupportedCurrency } from "./types";
import type { VoiceDraftStage } from "./voice-entry/types";

type TransactionEntryProps = {
  token: string;
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
  const options = buildCategoryOptions(props.categoryCatalog, props.kind);
  const hasCategoryNameFallback = props.categoryName.trim().length > 0;
  const [voiceStage, setVoiceStage] = useState<VoiceDraftStage>("idle");
  const isVoiceBackdropVisible = voiceStage === "recording" || voiceStage === "processing" || voiceStage === "transcribing" || voiceStage === "parsing";
  const applyVoiceDraft = (draft: {
    draft: {
      kind: "EXPENSE" | "INCOME" | null;
      amount: number | null;
      currency: SupportedCurrency | null;
      categoryId: string | null;
      categoryNameCandidate: string | null;
      note: string | null;
    };
  }) => {
    if (draft.draft.kind) {
      props.setKind(draft.draft.kind);
    }

    if (typeof draft.draft.amount === "number") {
      props.setAmount(String(draft.draft.amount));
    }

    if (draft.draft.currency) {
      props.setCurrency(draft.draft.currency);
    }

    if (draft.draft.categoryId) {
      props.setSelectedCategoryId(draft.draft.categoryId);
      props.setCategoryName("");
    } else if (draft.draft.categoryNameCandidate) {
      props.setSelectedCategoryId("");
      props.setCategoryName(draft.draft.categoryNameCandidate);
    }

    if (draft.draft.note !== null) {
      props.setNote(draft.draft.note);
    }
  };

  return (
    <Card className="panel-soft">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><PlusCircle className="size-5 text-pop" />Add income or expense</CardTitle>
        <CardDescription>Transactions are saved to your active couple workspace: {props.workspaceName}</CardDescription>
      </CardHeader>
      <CardContent className="relative">
        <div
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-4 rounded-[28px] bg-[rgba(250,247,242,0.06)] backdrop-blur-sm transition-opacity duration-200 dark:bg-[rgba(18,16,14,0.18)]",
            isVoiceBackdropVisible ? "opacity-100" : "opacity-0"
          )}
        />
        <form className="relative z-10 space-y-4" onSubmit={props.onSubmit}>
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
            <label className="space-y-1 text-sm md:col-span-2"><span className="field-label">Amount</span><TextField required inputMode="decimal" min="0.01" step="0.01" value={props.amount} onChange={(event) => props.setAmount(event.target.value)} placeholder="45000" /></label>
            <label className="space-y-1 text-sm md:col-span-2"><span className="field-label">Currency</span><SelectField value={props.currency} onChange={(event) => props.setCurrency(event.target.value as SupportedCurrency)}>{supportedCurrencies.map((item) => <option key={item} value={item}>{item}</option>)}</SelectField></label>
            <label className="space-y-1 text-sm md:col-span-2">
              <span className="field-label">Category</span>
              <SelectField required={!hasCategoryNameFallback} value={props.selectedCategoryId} onChange={(event) => {
                props.setSelectedCategoryId(event.target.value);
                if (event.target.value) {
                  props.setCategoryName("");
                }
              }}>
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
            <label className="space-y-1 text-sm md:col-span-6">
              <span className="field-label">Category name (optional)</span>
              <TextField
                maxLength={60}
                value={props.categoryName}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  props.setCategoryName(nextValue);
                  if (nextValue.trim()) {
                    props.setSelectedCategoryId("");
                  }
                }}
                placeholder="Create a new category"
              />
              <p className="body-muted text-xs">Leave this empty to use the selected category. Fill it only if you want the transaction to create a new category on save.</p>
            </label>
          </div>
          <label className="space-y-1 text-sm"><span className="field-label">Note (optional)</span><TextField value={props.note} onChange={(event) => props.setNote(event.target.value)} placeholder="short context" /></label>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <VoiceEntryPanel
              token={props.token}
              onDraftResolved={applyVoiceDraft}
              onStageChange={setVoiceStage}
            />
            <div className="flex flex-wrap items-center gap-3 lg:justify-end">
              <Button type="submit" disabled={props.isSubmittingTx} pending={props.isSubmittingTx} pendingText="Saving...">Save transaction</Button>
              {props.txMessage ? <p className="status-success text-sm">{props.txMessage}</p> : null}
              {props.txError ? <p className="status-error text-sm">{props.txError}</p> : null}
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
