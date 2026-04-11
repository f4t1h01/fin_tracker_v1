import type { AiTransactionDraft, AiTransactionDraftLike } from "../ai-draft-types";

export type VoiceDraftStage = "idle" | "recording" | "processing" | "transcribing" | "parsing" | "ready" | "error";

export type VoiceTransactionDraft = AiTransactionDraft;

export type VoiceTransactionDraftResponse = AiTransactionDraftLike & {
  transcript: string;
};
