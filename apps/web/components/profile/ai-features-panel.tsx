"use client";

import { useEffect, useRef, useState } from "react";

import { ImagePlus, Mic, Sparkles, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useDismissableLayer } from "@/components/ui/use-dismissable-layer";
import { cn } from "@/lib/cn";

import type { VoiceTransactionDraftResponse } from "./voice-entry/types";
import { useVoiceEntry } from "./voice-entry/use-voice-entry";
import { VoiceRecorderButton } from "./voice-entry/voice-recorder-button";
import { VoiceStatus } from "./voice-entry/voice-status";

type AiFeaturesPanelProps = {
  token: string;
  onDraftResolved: (draft: VoiceTransactionDraftResponse) => void;
};

type ActiveAiFeature = "menu" | "voice";

export function AiFeaturesPanel(props: AiFeaturesPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeFeature, setActiveFeature] = useState<ActiveAiFeature>("menu");
  const dialogRef = useRef<HTMLDivElement | null>(null);

  const voice = useVoiceEntry({
    token: props.token,
    onDraftResolved: props.onDraftResolved
  });

  const hasInlineSummary = voice.result !== null || voice.error !== null;
  const shouldShowVoiceStatus = voice.stage !== "idle" || voice.result !== null || voice.error !== null;
  const isDismissLocked = voice.stage === "recording" || voice.isBusy;

  const closePanel = () => {
    if (isDismissLocked) {
      return;
    }

    setIsOpen(false);
    setActiveFeature("menu");
  };

  useDismissableLayer({
    open: isOpen && !isDismissLocked,
    onDismiss: closePanel,
    refs: [dialogRef]
  });

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          className="rounded-full border-[rgba(201,168,76,0.28)] bg-[color-mix(in_srgb,var(--warm-white)_82%,transparent)] px-4 py-3 text-[12px] font-semibold tracking-[0.14em]"
          onClick={() => {
            setIsOpen(true);
            setActiveFeature("menu");
          }}
        >
          <Sparkles className="size-4" />
          AI Features
        </Button>
        <p className="body-muted max-w-xl text-xs">
          Use AI to draft the transaction first, then review the same form fields and save manually.
        </p>
      </div>

      {hasInlineSummary ? (
        <div className="space-y-2">
          <div className="detail-box flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="field-label">AI draft summary</p>
              <p className="body-muted text-sm">
                These AI details are read-only. Edit the transaction fields above if you want to change kind, amount,
                category, or note before saving.
              </p>
            </div>
            <span className="rounded-full border border-[rgba(201,168,76,0.18)] bg-[color-mix(in_srgb,var(--gold)_10%,transparent)] px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-[var(--ink-soft)]">
              {voice.result ? "Draft ready" : "Needs retry"}
            </span>
          </div>
          <VoiceStatus
            draft={voice.result}
            error={voice.error}
            onClearDraft={voice.resetDraft}
            recordingSeconds={voice.recordingSeconds}
            stage={voice.stage}
            stageLabel={voice.stageLabel}
            title="AI draft details"
          />
        </div>
      ) : null}

      {isOpen ? (
        <div className="fixed inset-0 z-[130]">
          <div className="absolute inset-0 bg-[rgba(19,16,13,0.38)] backdrop-blur-xl" />

          <div className="relative flex min-h-screen items-center justify-center px-4 py-8">
            <div
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-label="AI features"
              className="panel-soft w-full max-w-xl rounded-[28px] border border-[rgba(201,168,76,0.18)] p-5 shadow-[0_28px_80px_rgba(26,20,16,0.24)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <p className="eyebrow-row">AI tools</p>
                  <h3 className="font-[family-name:var(--font-heading)] text-[clamp(28px,4vw,38px)] font-light leading-[1.08]">
                    {activeFeature === "voice" ? "Voice transaction draft" : "Choose an AI feature"}
                  </h3>
                  <p className="body-muted max-w-lg text-sm">
                    {activeFeature === "voice"
                      ? "Record one transaction, let AI fill the form, then review and save manually."
                      : "Start with voice drafting today. Image drafting stays visible here, but it is intentionally unavailable until the next batch."}
                  </p>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  className="rounded-full border border-[rgba(201,168,76,0.14)] px-3 py-2"
                  onClick={closePanel}
                  disabled={isDismissLocked}
                  aria-label="Close AI features"
                >
                  <X className="size-4" />
                </Button>
              </div>

              {activeFeature === "menu" ? (
                <div className="mt-6 flex flex-col items-center justify-center gap-4 py-4">
                  <button
                    type="button"
                    className="w-full rounded-[24px] border border-[rgba(201,168,76,0.22)] bg-[color-mix(in_srgb,var(--warm-white)_84%,transparent)] px-5 py-5 text-left transition-transform duration-200 hover:-translate-y-0.5 hover:border-[var(--gold)]"
                    onClick={() => setActiveFeature("voice")}
                  >
                    <span className="flex items-start gap-4">
                      <span className="flex size-12 shrink-0 items-center justify-center rounded-full border border-[rgba(201,168,76,0.18)] bg-[color-mix(in_srgb,var(--gold)_10%,transparent)] text-[var(--gold)]">
                        <Mic className="size-5" />
                      </span>
                      <span className="min-w-0 space-y-1">
                        <span className="block text-[13px] font-semibold uppercase tracking-[0.14em] text-[var(--ink)]">
                          Voice feature
                        </span>
                        <span className="body-muted block text-sm">
                          Record a short note and prefill the same transaction form without changing your save flow.
                        </span>
                      </span>
                    </span>
                  </button>

                  <button
                    type="button"
                    aria-disabled="true"
                    className="w-full cursor-not-allowed rounded-[24px] border border-dashed border-[rgba(201,168,76,0.18)] bg-[color-mix(in_srgb,var(--warm-white)_76%,transparent)] px-5 py-5 text-left opacity-80"
                  >
                    <span className="flex items-start gap-4">
                      <span className="flex size-12 shrink-0 items-center justify-center rounded-full border border-[rgba(201,168,76,0.16)] bg-[color-mix(in_srgb,var(--gold)_8%,transparent)] text-[var(--ink-soft)]">
                        <ImagePlus className="size-5" />
                      </span>
                      <span className="min-w-0 space-y-1">
                        <span className="block text-[13px] font-semibold uppercase tracking-[0.14em] text-[var(--ink)]">
                          Image feature
                        </span>
                        <span className="body-muted block text-sm">
                          Currently unavailable. The entry point is ready, but the actual image workflow will be implemented later.
                        </span>
                      </span>
                    </span>
                  </button>
                </div>
              ) : (
                <div className="mt-6 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <Button
                      type="button"
                      variant="ghost"
                      className="rounded-full border border-[rgba(201,168,76,0.14)] px-4 py-2"
                      onClick={() => setActiveFeature("menu")}
                      disabled={isDismissLocked}
                    >
                      <span>Back to features</span>
                    </Button>
                    <span className={cn(
                      "rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.14em]",
                      voice.stage === "recording"
                        ? "bg-rose-500/12 text-rose-700 dark:text-rose-100"
                        : "border border-[rgba(201,168,76,0.18)] bg-[color-mix(in_srgb,var(--gold)_10%,transparent)] text-[var(--ink-soft)]"
                    )}>
                      {voice.stage === "recording" ? "Recording live" : voice.result ? "Draft filled" : "Voice workflow"}
                    </span>
                  </div>

                  {shouldShowVoiceStatus ? (
                    <VoiceStatus
                      draft={voice.result}
                      error={voice.error}
                      onClearDraft={voice.resetDraft}
                      recordingSeconds={voice.recordingSeconds}
                      stage={voice.stage}
                      stageLabel={voice.stageLabel}
                    />
                  ) : (
                    <div className="detail-box space-y-2">
                      <p className="field-label">Voice guidance</p>
                      <p className="body-muted text-sm">
                        Use one voice note for one transaction. After AI fills the draft, the transaction form stays
                        editable and the final save still happens manually.
                      </p>
                    </div>
                  )}

                  <div className="flex justify-center">
                    <VoiceRecorderButton
                      isBusy={voice.isBusy}
                      isRecorderSupported={voice.isRecorderSupported}
                      isRecording={voice.stage === "recording"}
                      recordingSeconds={voice.recordingSeconds}
                      onStartRecording={voice.startRecording}
                      onStopRecording={voice.stopRecording}
                    />
                  </div>

                  {voice.result !== null || voice.error !== null ? (
                    <div className="flex justify-center">
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-full px-5 py-3"
                        onClick={closePanel}
                        disabled={isDismissLocked}
                      >
                        Continue to form
                      </Button>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
