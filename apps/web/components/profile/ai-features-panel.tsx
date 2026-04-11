"use client";

import { createPortal } from "react-dom";
import { useRef, useState } from "react";

import { Camera, ImagePlus, Mic, Sparkles, Upload, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useDismissableLayer } from "@/components/ui/use-dismissable-layer";
import { cn } from "@/lib/cn";

import type { AiTransactionDraftLike } from "./ai-draft-types";
import { ImageStatus } from "./image-entry/image-status";
import { useImageEntry } from "./image-entry/use-image-entry";
import { useVoiceEntry } from "./voice-entry/use-voice-entry";
import { VoiceRecorderButton } from "./voice-entry/voice-recorder-button";
import { VoiceStatus } from "./voice-entry/voice-status";

type AiFeaturesPanelProps = {
  token: string;
  onDraftResolved: (draft: AiTransactionDraftLike) => void;
};

type ActiveAiFeature = "menu" | "voice" | "image";

export function AiFeaturesPanel(props: AiFeaturesPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeFeature, setActiveFeature] = useState<ActiveAiFeature>("menu");
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const portalTarget = typeof document !== "undefined" ? document.body : null;

  const voice = useVoiceEntry({
    token: props.token,
    onDraftResolved: props.onDraftResolved
  });
  const image = useImageEntry({
    token: props.token,
    onDraftResolved: props.onDraftResolved
  });

  const isDismissLocked = voice.stage === "recording" || voice.isBusy || image.isBusy;

  const closePanel = () => {
    if (isDismissLocked) {
      return;
    }

    if (activeFeature === "image" && image.stage === "capturing") {
      image.cancelCapture();
    }

    setIsOpen(false);
    setActiveFeature("menu");
  };

  const goBackToMenu = () => {
    if (isDismissLocked) {
      return;
    }

    if (activeFeature === "image" && image.stage === "capturing") {
      image.cancelCapture();
    }

    setActiveFeature("menu");
  };

  useDismissableLayer({
    open: isOpen && !isDismissLocked,
    onDismiss: closePanel,
    refs: [dialogRef]
  });

  const title = activeFeature === "voice" ? "Voice note" : activeFeature === "image" ? "Receipt image" : "Choose a tool";
  const description = activeFeature === "voice"
    ? "Record one short note and review it here before saving."
    : activeFeature === "image"
      ? "Capture or upload one receipt image and review the extracted draft before saving."
      : "Voice and receipt drafting are both available here.";

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

      {isOpen && portalTarget
        ? createPortal(
            <div className="fixed inset-0 z-[200] overflow-y-auto overscroll-contain bg-[var(--modal-scrim)] backdrop-blur-[28px] backdrop-saturate-150">
              <div className="flex min-h-[100dvh] items-center justify-center p-4 md:p-8">
                <div
                  ref={dialogRef}
                  role="dialog"
                  aria-modal="true"
                  aria-label="AI tools"
                  className="flex max-h-[calc(100dvh-2rem)] w-full max-w-xl flex-col overflow-hidden rounded-[28px] border border-[rgba(201,168,76,0.12)] bg-[var(--surface-glass)] p-5 shadow-[0_24px_56px_rgba(26,20,16,0.2)] backdrop-blur-[18px] md:max-h-[calc(100dvh-4rem)]"
                >
                  <div className="flex shrink-0 items-start justify-between gap-4">
                    <div className="space-y-2">
                      <p className="eyebrow-row">AI tools</p>
                      <h3 className="font-[family-name:var(--font-heading)] text-[clamp(28px,4vw,36px)] font-light leading-[1.08]">
                        {title}
                      </h3>
                      <p className="body-muted max-w-lg text-sm">{description}</p>
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

                  <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
                    {activeFeature === "menu" ? (
                      <div className="flex flex-col items-center justify-center gap-4 py-4">
                        <button
                          type="button"
                          className="w-full rounded-[24px] border border-[rgba(201,168,76,0.22)] bg-[var(--surface-glass-strong)] px-5 py-5 text-left transition-transform duration-200 hover:-translate-y-0.5 hover:border-[var(--gold)]"
                          onClick={() => setActiveFeature("voice")}
                        >
                          <span className="flex items-start gap-4">
                            <span className="flex size-12 shrink-0 items-center justify-center rounded-full border border-[rgba(201,168,76,0.18)] bg-[color-mix(in_srgb,var(--gold)_10%,transparent)] text-[var(--gold)]">
                              <Mic className="size-5" />
                            </span>
                            <span className="min-w-0 space-y-1">
                              <span className="block text-[13px] font-semibold uppercase tracking-[0.14em] text-[var(--ink)]">Voice note</span>
                              <span className="body-muted block text-sm">Record one transaction and fill the form from voice.</span>
                            </span>
                          </span>
                        </button>

                        <button
                          type="button"
                          className="w-full rounded-[24px] border border-[rgba(201,168,76,0.22)] bg-[var(--surface-glass-strong)] px-5 py-5 text-left transition-transform duration-200 hover:-translate-y-0.5 hover:border-[var(--gold)]"
                          onClick={() => setActiveFeature("image")}
                        >
                          <span className="flex items-start gap-4">
                            <span className="flex size-12 shrink-0 items-center justify-center rounded-full border border-[rgba(201,168,76,0.16)] bg-[color-mix(in_srgb,var(--gold)_8%,transparent)] text-[var(--gold)]">
                              <ImagePlus className="size-5" />
                            </span>
                            <span className="min-w-0 space-y-1">
                              <span className="block text-[13px] font-semibold uppercase tracking-[0.14em] text-[var(--ink)]">Image draft</span>
                              <span className="body-muted block text-sm">Scan one receipt and fill the form from an image.</span>
                            </span>
                          </span>
                        </button>
                      </div>
                    ) : activeFeature === "voice" ? (
                      <div className="mt-6 space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <Button
                            type="button"
                            variant="ghost"
                            className="rounded-full border border-[rgba(201,168,76,0.14)] px-4 py-2"
                            onClick={goBackToMenu}
                            disabled={isDismissLocked}
                          >
                            Back
                          </Button>
                          <span
                            className={cn(
                              "rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.14em]",
                              voice.stage === "recording"
                                ? "bg-rose-500/12 text-rose-700 dark:text-rose-100"
                                : voice.result
                                  ? "border border-[rgba(122,158,126,0.24)] bg-[color-mix(in_srgb,var(--sage)_10%,transparent)] text-[var(--ink-soft)]"
                                  : "border border-[rgba(201,168,76,0.18)] bg-[color-mix(in_srgb,var(--gold)_10%,transparent)] text-[var(--ink-soft)]"
                            )}
                          >
                            {voice.stage === "recording" ? "Recording" : voice.result ? "Ready" : "Voice"}
                          </span>
                        </div>

                        <VoiceStatus
                          draft={voice.result}
                          error={voice.error}
                          onClearDraft={voice.resetDraft}
                          stage={voice.stage}
                          stageLabel={voice.stageLabel}
                        />

                        <div className="w-full">
                          <VoiceRecorderButton
                            isBusy={voice.isBusy}
                            isRecorderSupported={voice.isRecorderSupported}
                            isRecording={voice.stage === "recording"}
                            recordingSeconds={voice.recordingSeconds}
                            stageLabel={voice.stageLabel}
                            visualizerLevels={voice.visualizerLevels}
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
                    ) : (
                      <div className="mt-6 space-y-4">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
                          className="hidden"
                          onChange={(event) => {
                            image.selectFile(event.target.files?.[0] ?? null);
                            event.currentTarget.value = "";
                          }}
                        />

                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <Button
                            type="button"
                            variant="ghost"
                            className="rounded-full border border-[rgba(201,168,76,0.14)] px-4 py-2"
                            onClick={goBackToMenu}
                            disabled={isDismissLocked}
                          >
                            Back
                          </Button>
                          <span
                            className={cn(
                              "rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.14em]",
                              image.stage === "capturing"
                                ? "bg-[color-mix(in_srgb,var(--gold)_14%,transparent)] text-[var(--ink)]"
                                : image.result
                                  ? "border border-[rgba(122,158,126,0.24)] bg-[color-mix(in_srgb,var(--sage)_10%,transparent)] text-[var(--ink-soft)]"
                                  : "border border-[rgba(201,168,76,0.18)] bg-[color-mix(in_srgb,var(--gold)_10%,transparent)] text-[var(--ink-soft)]"
                            )}
                          >
                            {image.stage === "capturing" ? "Capturing" : image.result ? "Ready" : "Image"}
                          </span>
                        </div>

                        <ImageStatus
                          draft={image.result}
                          error={image.error}
                          onClearDraft={image.resetDraft}
                          stage={image.stage}
                          stageLabel={image.stageLabel}
                        />

                        <div className="space-y-3">
                          {image.stage === "capturing" ? (
                            <div className="overflow-hidden rounded-[24px] border border-[rgba(201,168,76,0.18)] bg-[var(--surface-glass-strong)]">
                              <video ref={image.videoRef} className="aspect-[4/3] w-full object-cover" muted playsInline autoPlay />
                            </div>
                          ) : image.previewUrl && image.isPreviewRenderable ? (
                            <div className="overflow-hidden rounded-[24px] border border-[rgba(201,168,76,0.18)] bg-[var(--surface-glass-strong)]">
                              <img src={image.previewUrl} alt="Receipt preview" className="aspect-[4/3] w-full object-contain" />
                            </div>
                          ) : image.previewName ? (
                            <div className="detail-box rounded-[24px] px-4 py-4 text-sm">
                              <p className="field-label">Selected file</p>
                              <p className="mt-2 font-medium">{image.previewName}</p>
                              {!image.isPreviewRenderable ? <p className="body-muted mt-1">Preview is unavailable for this format, but the file will still be processed.</p> : null}
                            </div>
                          ) : null}

                          {image.stage === "capturing" ? (
                            <div className="flex flex-wrap gap-3">
                              <Button type="button" className="min-h-12 flex-1 px-5 py-3" onClick={image.captureImage}>
                                <Camera className="size-4" />
                                Capture image
                              </Button>
                              <Button type="button" variant="outline" className="min-h-12 px-5 py-3" onClick={image.cancelCapture}>
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <div className="grid gap-3 md:grid-cols-2">
                              <Button
                                type="button"
                                variant="outline"
                                className="min-h-12 px-5 py-3"
                                onClick={image.startCapture}
                                disabled={!image.isCameraSupported || image.isBusy}
                              >
                                <Camera className="size-4" />
                                Capture image
                              </Button>
                              <Button
                                type="button"
                                className="min-h-12 px-5 py-3"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={image.isBusy}
                              >
                                <Upload className="size-4" />
                                Upload image
                              </Button>
                            </div>
                          )}

                          {!image.isCameraSupported && image.stage !== "capturing" ? (
                            <p className="body-muted text-sm">Camera capture is unavailable in this browser. Upload still works.</p>
                          ) : null}
                        </div>

                        {image.result !== null || image.error !== null ? (
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
            </div>,
            portalTarget
          )
        : null}
    </div>
  );
}
