"use client";

import { CheckCircle2, LoaderCircle, Trash2, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

import { VOICE_RECORDING_MIN_SECONDS } from "./voice-entry.constants";
import type { VoiceDraftStage, VoiceTransactionDraftResponse } from "./types";

type VoiceStatusProps = {
  stage: VoiceDraftStage;
  stageLabel: string;
  recordingSeconds: number;
  draft: VoiceTransactionDraftResponse | null;
  error: string | null;
  onClearDraft: () => void;
};

function formatConfidence(value: number) {
  return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;
}

export function VoiceStatus(props: VoiceStatusProps) {
  const hasDraft = Boolean(props.draft);
  const hasWarnings = Boolean(props.draft?.draft.warnings.length);
  const hasMissingFields = Boolean(props.draft?.draft.missingFields.length);

  return (
    <div
      className={cn(
        "space-y-3 rounded-2xl border border-[rgba(201,168,76,0.12)] bg-[color-mix(in_srgb,var(--gold)_4%,var(--card-bg))] p-4",
        props.stage === "error" ? "border-red-300/30 bg-red-500/10 dark:border-red-400/25 dark:bg-red-500/10" : ""
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="field-label">Voice status</p>
          <p className={cn("text-sm", props.stage === "error" ? "status-error" : "body-muted")}>
            {props.stage === "recording" ? `Recording ${String(props.recordingSeconds).padStart(2, "0")}s` : props.stageLabel}
          </p>
        </div>
        {hasDraft || props.error ? (
          <Button type="button" variant="ghost" onClick={props.onClearDraft}>
            <Trash2 className="size-4" />
            Reset
          </Button>
        ) : null}
      </div>

      {props.error ? (
        <div className="detail-box flex items-start gap-2 border-red-300/20 bg-red-500/10 px-3 py-3 text-sm text-red-700 dark:border-red-400/25 dark:text-red-100">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <span>{props.error}</span>
        </div>
      ) : null}

      {props.draft ? (
        <div className="space-y-3">
          <div className="detail-box space-y-2 px-3 py-3 text-sm">
            <p className="body-muted text-xs uppercase tracking-[0.16em]">Transcript</p>
            <p className="whitespace-pre-wrap break-words text-sm text-[var(--ink)]">{props.draft.transcript}</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <div className="detail-box space-y-1 px-3 py-3 text-sm">
              <p className="body-muted text-xs uppercase tracking-[0.16em]">Kind</p>
              <p className="font-medium">{props.draft.draft.kind ?? "Not detected"}</p>
            </div>
            <div className="detail-box space-y-1 px-3 py-3 text-sm">
              <p className="body-muted text-xs uppercase tracking-[0.16em]">Amount</p>
              <p className="font-medium">{props.draft.draft.amount === null ? "Not detected" : props.draft.draft.amount.toLocaleString()}</p>
            </div>
            <div className="detail-box space-y-1 px-3 py-3 text-sm">
              <p className="body-muted text-xs uppercase tracking-[0.16em]">Currency</p>
              <p className="font-medium">{props.draft.draft.currency ?? "Not detected"}</p>
            </div>
            <div className="detail-box space-y-1 px-3 py-3 text-sm">
              <p className="body-muted text-xs uppercase tracking-[0.16em]">Category</p>
              <p className="font-medium">{props.draft.draft.categoryId ? "Resolved in catalog" : props.draft.draft.categoryNameCandidate ?? "Not detected"}</p>
            </div>
            <div className="detail-box space-y-1 px-3 py-3 text-sm">
              <p className="body-muted text-xs uppercase tracking-[0.16em]">Confidence</p>
              <p className="font-medium">{formatConfidence(props.draft.draft.confidence)}</p>
            </div>
            <div className="detail-box space-y-1 px-3 py-3 text-sm">
              <p className="body-muted text-xs uppercase tracking-[0.16em]">Note</p>
              <p className="font-medium">{props.draft.draft.note ?? "Not detected"}</p>
            </div>
          </div>

          {hasMissingFields ? (
            <div className="detail-box space-y-2 px-3 py-3 text-sm">
              <p className="body-muted text-xs uppercase tracking-[0.16em]">Missing fields</p>
              <div className="flex flex-wrap gap-2">
                {props.draft.draft.missingFields.map((field) => (
                  <span key={field} className="rounded-full border border-[rgba(201,168,76,0.16)] bg-[color-mix(in_srgb,var(--gold)_8%,transparent)] px-2.5 py-1 text-xs uppercase tracking-[0.08em] text-[var(--ink-soft)]">
                    {field}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {hasWarnings ? (
            <div className="detail-box space-y-2 px-3 py-3 text-sm">
              <p className="body-muted text-xs uppercase tracking-[0.16em]">Warnings</p>
              <div className="space-y-1">
                {props.draft.draft.warnings.map((warning) => (
                  <p key={warning} className="flex items-start gap-2 text-sm text-[var(--ink-soft)]">
                    <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" />
                    <span>{warning}</span>
                  </p>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : props.stage === "recording" ? (
        <div className="detail-box flex items-center gap-2 px-3 py-3 text-sm text-[var(--ink-soft)]">
          <LoaderCircle className="size-4 animate-spin text-pop" />
          <span>The voice recorder is active. Speak naturally and keep one transaction per note. Keep recording for at least {VOICE_RECORDING_MIN_SECONDS} seconds.</span>
        </div>
      ) : (
        <p className="body-muted text-sm">Press the button above to record a short voice note. Keep it at least {VOICE_RECORDING_MIN_SECONDS} seconds so it is processed. The form below stays editable until you save.</p>
      )}

      {!props.draft && !props.error && props.stage !== "recording" ? (
        <div className="detail-box flex items-start gap-2 px-3 py-3 text-sm">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-pop" />
          <p className="body-muted">Voice notes work best when they describe a single income or expense with amount, currency, and category in one sentence.</p>
        </div>
      ) : null}
    </div>
  );
}
