"use client";

import { CheckCircle2, LoaderCircle, Trash2, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

import type { VoiceDraftStage, VoiceTransactionDraftResponse } from "./types";

type VoiceStatusProps = {
  stage: VoiceDraftStage;
  stageLabel: string;
  draft: VoiceTransactionDraftResponse | null;
  error: string | null;
  onClearDraft: () => void;
  title?: string;
};

export function VoiceStatus(props: VoiceStatusProps) {
  const hasDraft = Boolean(props.draft);
  const hasWarnings = Boolean(props.draft?.draft.warnings.length);
  const hasMissingFields = Boolean(props.draft?.draft.missingFields.length);
  const isBusy = props.stage === "processing" || props.stage === "transcribing" || props.stage === "parsing";
  const isRecording = props.stage === "recording";
  const showReset = hasDraft || Boolean(props.error);

  return (
    <div
      className={cn(
        "space-y-3 rounded-2xl border p-4",
        props.error
          ? "border-red-300/30 bg-red-500/10 dark:border-red-400/25 dark:bg-red-500/10"
          : hasDraft
            ? "border-[rgba(122,158,126,0.2)] bg-[color-mix(in_srgb,var(--sage)_6%,var(--card-bg))]"
            : "border-[rgba(201,168,76,0.12)] bg-[color-mix(in_srgb,var(--gold)_4%,var(--card-bg))]"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="field-label">{props.title ?? "Voice status"}</p>
          <p className={cn("text-sm font-medium", props.error ? "status-error" : hasDraft ? "status-success" : "body-muted")}>{props.stageLabel}</p>
        </div>

        {showReset ? (
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

      {!props.error && isBusy ? (
        <div className="detail-box flex items-start gap-2 px-3 py-3 text-sm">
          <LoaderCircle className="mt-0.5 size-4 shrink-0 animate-spin text-pop" />
          <p className="body-muted">{props.stageLabel}.</p>
        </div>
      ) : null}

      {!props.error && props.draft ? (
        <div className="space-y-3">
          <div className="detail-box flex items-start gap-2 px-3 py-3 text-sm">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-pop" />
            <p className="body-muted">The form has been filled.</p>
          </div>

          {hasMissingFields ? <p className="text-xs uppercase tracking-[0.12em] text-[var(--ink-soft)]">Some details were left blank.</p> : null}

          {hasWarnings ? (
            <div className="space-y-1">
              {props.draft.draft.warnings.map((warning) => (
                <p key={warning} className="flex items-start gap-2 text-sm text-[var(--ink-soft)]">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" />
                  <span>{warning}</span>
                </p>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {!props.error && !isBusy && !hasDraft ? (
        <p className="body-muted text-sm">
          {isRecording ? "Recording. Speak naturally." : "Record one short note for one transaction."}
        </p>
      ) : null}
    </div>
  );
}
