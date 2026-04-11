"use client";

import { CheckCircle2, LoaderCircle, Trash2, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

import { findCategoryOptionById } from "../category-options";
import type { CategoryCatalogResponse } from "../types";
import type { VoiceDraftStage, VoiceTransactionDraftResponse } from "./types";

type VoiceStatusProps = {
  stage: VoiceDraftStage;
  stageLabel: string;
  draft: VoiceTransactionDraftResponse | null;
  error: string | null;
  onClearDraft: () => void;
  categoryCatalog: CategoryCatalogResponse | null;
  title?: string;
};

type FieldRow = {
  label: string;
  value: string;
  secondary?: string | null;
};

function formatAmount(value: number | null) {
  if (value === null) {
    return null;
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2
  }).format(value);
}

function formatKind(value: "EXPENSE" | "INCOME" | null) {
  if (!value) {
    return null;
  }

  return value === "EXPENSE" ? "Expense" : "Income";
}

function resolveDraftFields(draft: VoiceTransactionDraftResponse | null, categoryCatalog: CategoryCatalogResponse | null): FieldRow[] {
  const voiceDraft = draft?.draft ?? null;
  const kind = voiceDraft?.kind ?? null;
  const categoryLabel =
    kind && voiceDraft?.categoryId
      ? findCategoryOptionById(categoryCatalog, kind, voiceDraft.categoryId, { forceIncludeShared: true })?.label ?? null
      : null;

  return [
    {
      label: "Type",
      value: formatKind(kind) ?? "Not detected"
    },
    {
      label: "Amount",
      value: formatAmount(voiceDraft?.amount ?? null) ?? "Not detected"
    },
    {
      label: "Currency",
      value: voiceDraft?.currency ?? "Not detected"
    },
    {
      label: "Category",
      value: categoryLabel ?? "Not detected",
      secondary:
        !categoryLabel && voiceDraft?.categoryNameCandidate
          ? `Suggested: ${voiceDraft.categoryNameCandidate}`
          : null
    },
    {
      label: "Note",
      value: voiceDraft?.note?.trim() ? voiceDraft.note.trim() : "Not detected"
    }
  ];
}

export function VoiceStatus(props: VoiceStatusProps) {
  const hasDraft = Boolean(props.draft);
  const hasWarnings = Boolean(props.draft?.draft.warnings.length);
  const isBusy = props.stage === "processing" || props.stage === "transcribing" || props.stage === "parsing";
  const isRecording = props.stage === "recording";
  const showReset = hasDraft || Boolean(props.error);
  const title = props.draft ? "Transcript -> Fields" : props.title ?? "Voice status";
  const transcript = props.draft?.transcript?.trim() || "Not detected";
  const fieldRows = resolveDraftFields(props.draft, props.categoryCatalog);

  return (
    <div
      className={cn(
        "space-y-4 rounded-2xl border p-4",
        props.error
          ? "border-red-300/30 bg-red-500/10 dark:border-red-400/25 dark:bg-red-500/10"
          : hasDraft
            ? "border-[rgba(122,158,126,0.2)] bg-[color-mix(in_srgb,var(--sage)_6%,var(--card-bg))]"
            : "border-[rgba(201,168,76,0.12)] bg-[color-mix(in_srgb,var(--gold)_4%,var(--card-bg))]"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="field-label">{title}</p>
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
        <div className="space-y-4">
          <div className="detail-box space-y-2 px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--ink-soft)]">Transcript</p>
              <CheckCircle2 className="size-4 shrink-0 text-pop" />
            </div>
            <p className="max-h-28 overflow-auto whitespace-pre-wrap break-words text-[13px] leading-6 text-[var(--ink)]">{transcript}</p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {fieldRows.map((field) => (
              <div key={field.label} className="detail-box space-y-2 px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--ink-soft)]">{field.label}</p>
                <p className={cn("text-sm font-medium leading-6", field.value === "Not detected" ? "body-muted" : "text-[var(--ink)]")}>{field.value}</p>
                {field.secondary ? <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--ink-soft)]">{field.secondary}</p> : null}
              </div>
            ))}
          </div>

          {hasWarnings ? (
            <div className="space-y-2">
              {props.draft.draft.warnings.map((warning) => (
                <p key={warning} className="flex items-start gap-2 text-sm text-[var(--ink-soft)]">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" />
                  <span>{warning}</span>
                </p>
              ))}
            </div>
          ) : null}

          <p className="text-sm leading-6 text-[var(--ink-soft)]">Everything has been written down here. Review and continue when ready.</p>
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
