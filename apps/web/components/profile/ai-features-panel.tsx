"use client";

import { useRef, useState } from "react";

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

  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        <Button
          type="button"
          variant="outline"
          className="!rounded-full border-[rgba(201,168,76,0.28)] bg-[color-mix(in_srgb,var(--warm-white)_82%,transparent)] px-4 py-3 text-[12px] font-semibold tracking-[0.14em]"
          onClick={() => {
            setIsOpen(true);
            setActiveFeature("menu");
          }}
        >
          <Sparkles className="size-4" />
          AI Features
        </Button>
      </div>

      {hasInlineSummary ? (
        <div className="space-y-2">
          <div className="detail-box flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="field-label">AI draft</p>
              <p className="body-muted text-sm">Review the draft before saving.</p>
            </div>
            <span className="rounded-full border border-[rgba(201,168,76,0.18)] bg-[color-mix(in_srgb,var(--gold)_10%,transparent)] px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-[var(--ink-soft)]">
              {voice.result ? "Ready" : "Retry"}
            </span>
          </div>
          <VoiceStatus
            draft={voice.result}
            error={voice.error}
            onClearDraft={voice.resetDraft}
            recordingSeconds={voice.recordingSeconds}
            stage={voice.stage}
            stageLabel={voice.stageLabel}
            title="Draft status"
          />
        </div>
      ) : null}

      {isOpen ? (
        <div className="fixed inset-0 z-[130]">
          <div className="absolute inset-0 bg-transparent backdrop-blur-[22px]" />

          <div className="relative flex min-h-screen items-center justify-center px-4 py-8">
            <div
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-label="AI tools"
              className="panel-soft w-full max-w-xl rounded-[28px] border border-[rgba(201,168,76,0.12)] p-5 shadow-[0_24px_56px_rgba(26,20,16,0.14)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <p className="eyebrow-row">AI tools</p>
                  <h3 className="font-[family-name:var(--font-heading)] text-[clamp(28px,4vw,36px)] font-light leading-[1.08]">
                    {activeFeature === "voice" ? "Voice draft" : "Choose a tool"}
                  </h3>
                  <p className="body-muted max-w-lg text-sm">
                    {activeFeature === "voice" ? "Record one note, review the draft, then save it manually." : "Voice drafting is ready. Image drafting will come later."}
                  </p>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  className="rounded-full border border-[rgba(201,168,76,0.14)] px-3 py-2"
                  onClick={closePanel}
                  disabled={isDismissLocked}
                  aria-label="Close AI tools"
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
                        <span className="block text-[13px] font-semibold uppercase tracking-[0.14em] text-[var(--ink)]">Voice draft</span>
                        <span className="body-muted block text-sm">Record one transaction and fill the form from voice.</span>
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
                        <span className="block text-[13px] font-semibold uppercase tracking-[0.14em] text-[var(--ink)]">Image draft</span>
                        <span className="body-muted block text-sm">Coming later.</span>
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
                      Back
                    </Button>
                    <span
                      className={cn(
                        "rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.14em]",
                        voice.stage === "recording"
                          ? "bg-rose-500/12 text-rose-700 dark:text-rose-100"
                          : "border border-[rgba(201,168,76,0.18)] bg-[color-mix(in_srgb,var(--gold)_10%,transparent)] text-[var(--ink-soft)]"
                      )}
                    >
                      {voice.stage === "recording" ? "Recording" : voice.result ? "Ready" : "Voice"}
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
                      <p className="field-label">Voice hint</p>
                      <p className="body-muted text-sm">One clip per transaction.</p>
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
                        Continue
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
