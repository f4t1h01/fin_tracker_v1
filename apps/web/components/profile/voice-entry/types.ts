export type VoiceTransactionKind = "EXPENSE" | "INCOME";
export type VoiceDraftStage = "idle" | "recording" | "processing" | "transcribing" | "parsing" | "ready" | "error";

export type VoiceTransactionDraft = {
  kind: VoiceTransactionKind | null;
  amount: number | null;
  currency: "UZS" | "USD" | "EUR" | "RUB" | null;
  categoryId: string | null;
  categoryNameCandidate: string | null;
  note: string | null;
  confidence: number;
  missingFields: string[];
  warnings: string[];
};

export type VoiceTransactionDraftResponse = {
  transcript: string;
  draft: VoiceTransactionDraft;
};
