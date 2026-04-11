import type { SupportedCurrency } from "./types";

export type AiDraftKind = "EXPENSE" | "INCOME";

export type AiTransactionDraft = {
  kind: AiDraftKind | null;
  amount: number | null;
  currency: SupportedCurrency | null;
  categoryId: string | null;
  categoryNameCandidate: string | null;
  note: string | null;
  confidence: number;
  missingFields: string[];
  warnings: string[];
};

export type AiTransactionDraftLike = {
  draft: AiTransactionDraft;
};
