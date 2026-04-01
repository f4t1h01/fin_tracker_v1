"use client";

import { useEffect } from "react";

import { VoiceRecorderButton } from "./voice-recorder-button";
import { VoiceStatus } from "./voice-status";
import { useVoiceEntry } from "./use-voice-entry";
import type { VoiceDraftStage, VoiceTransactionDraftResponse } from "./types";

type VoiceEntryPanelProps = {
  token: string;
  onDraftResolved: (draft: VoiceTransactionDraftResponse) => void;
  onStageChange: (stage: VoiceDraftStage) => void;
};

export function VoiceEntryPanel(props: VoiceEntryPanelProps) {
  const voice = useVoiceEntry({
    token: props.token,
    onDraftResolved: props.onDraftResolved
  });

  useEffect(() => {
    props.onStageChange(voice.stage);
  }, [props.onStageChange, voice.stage]);

  const shouldShowStatus = voice.stage !== "idle" || voice.result !== null || voice.error !== null;

  return (
    <div className="space-y-3">
      {shouldShowStatus ? (
        <VoiceStatus
          draft={voice.result}
          error={voice.error}
          onClearDraft={voice.resetDraft}
          recordingSeconds={voice.recordingSeconds}
          stage={voice.stage}
          stageLabel={voice.stageLabel}
        />
      ) : null}
      <div className="flex items-start gap-3">
        <VoiceRecorderButton
          isBusy={voice.isBusy}
          isRecorderSupported={voice.isRecorderSupported}
          isRecording={voice.stage === "recording"}
          recordingSeconds={voice.recordingSeconds}
          onStartRecording={voice.startRecording}
          onStopRecording={voice.stopRecording}
        />
      </div>
    </div>
  );
}
