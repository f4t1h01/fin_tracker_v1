"use client";

import { Sparkles } from "lucide-react";

import { cn } from "@/lib/cn";

import { VoiceRecorderButton } from "./voice-recorder-button";
import { VoiceStatus } from "./voice-status";
import { VOICE_RECORDING_MIN_SECONDS } from "./voice-entry.constants";
import { useVoiceEntry } from "./use-voice-entry";
import type { VoiceTransactionDraftResponse } from "./types";

type VoiceEntryPanelProps = {
  token: string;
  workspaceName: string;
  onDraftResolved: (draft: VoiceTransactionDraftResponse) => void;
};

export function VoiceEntryPanel(props: VoiceEntryPanelProps) {
  const voice = useVoiceEntry({
    token: props.token,
    onDraftResolved: props.onDraftResolved
  });

  return (
    <section className={cn("detail-box space-y-4 p-4", voice.stage === "error" ? "border-red-300/20 bg-red-500/10 dark:border-red-400/20" : "")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="field-label flex items-center gap-2">
            <Sparkles className="size-4 text-pop" />
            Voice drafting
          </p>
          <p className="body-muted text-sm">Press the button to record a short voice note. The button acts as the recorder and shows the timer while you speak. Keep the note at least {VOICE_RECORDING_MIN_SECONDS} seconds long so it is processed. The draft fills the transaction form for {props.workspaceName} without saving it automatically.</p>
          {!voice.isRecorderSupported ? (
            <p className="status-error text-xs">Voice recording is not supported in this browser. Use a browser with microphone recording support.</p>
          ) : null}
        </div>
        <VoiceRecorderButton
          isBusy={voice.isBusy}
          isRecorderSupported={voice.isRecorderSupported}
          isRecording={voice.stage === "recording"}
          recordingSeconds={voice.recordingSeconds}
          onStartRecording={voice.startRecording}
          onStopRecording={voice.stopRecording}
        />
      </div>

      <VoiceStatus
        draft={voice.result}
        error={voice.error}
        onClearDraft={voice.resetDraft}
        recordingSeconds={voice.recordingSeconds}
        stage={voice.stage}
        stageLabel={voice.stageLabel}
      />
    </section>
  );
}
