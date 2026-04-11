"use client";

import type { CSSProperties } from "react";

import { Mic, Square } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

import { VOICE_RECORDING_MIN_SECONDS } from "./voice-entry.constants";

type VoiceRecorderStyle = CSSProperties & {
  [key: `--voice-recorder-${string}`]: string | number | undefined;
};

type VoiceRecorderButtonProps = {
  isRecording: boolean;
  isBusy: boolean;
  isRecorderSupported: boolean;
  recordingSeconds: number;
  stageLabel: string;
  visualizerLevels: readonly number[];
  onStartRecording: () => void;
  onStopRecording: () => void;
  className?: string;
  style?: VoiceRecorderStyle;
};

const DEFAULT_VOICE_RECORDER_STYLE: VoiceRecorderStyle = {
  "--voice-recorder-visualizer-height": "2.9rem",
  "--voice-recorder-visualizer-gap": "0.35rem",
  "--voice-recorder-visualizer-bar-width": "0.34rem"
};

function formatRecordingTime(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

export function VoiceRecorderButton(props: VoiceRecorderButtonProps) {
  const levels = props.visualizerLevels.length > 0 ? props.visualizerLevels : [0.18, 0.26, 0.22, 0.3, 0.2];
  const title = props.isRecording ? "Stop" : props.isRecorderSupported ? props.isBusy ? "Working" : "Record" : "Unavailable";
  const subtitle = props.isRecording
    ? formatRecordingTime(props.recordingSeconds)
    : props.isBusy
      ? props.stageLabel
      : props.isRecorderSupported
        ? `${VOICE_RECORDING_MIN_SECONDS}s min`
        : "Mic required";

  return (
    <Button
      type="button"
      variant="outline"
      disabled={props.isBusy || (!props.isRecorderSupported && !props.isRecording)}
      className={cn(
        "voice-recorder-button h-auto min-h-[5.5rem] w-full justify-between gap-4 whitespace-normal rounded-[28px] border-[rgba(201,168,76,0.24)] px-4 py-3 text-left normal-case tracking-normal shadow-none transition-colors hover:-translate-y-0.5 hover:border-[var(--gold)] hover:text-[var(--ink)]",
        props.isRecording
          ? "border-rose-400/50 bg-rose-500/15 text-rose-700 hover:border-rose-400/70 hover:text-rose-700 dark:text-rose-100 dark:hover:text-rose-100"
          : "bg-[color-mix(in_srgb,var(--warm-white)_84%,transparent)]",
        props.isBusy ? "cursor-wait opacity-90" : "",
        props.className
      )}
      style={{ ...DEFAULT_VOICE_RECORDER_STYLE, ...(props.style ?? {}) }}
      aria-pressed={props.isRecording}
      aria-label={props.isRecording ? "Stop voice recording" : "Start voice recording"}
      onClick={props.isRecording ? props.onStopRecording : props.onStartRecording}
    >
      <span className="flex min-w-0 flex-1 items-center gap-3">
        <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-full border", props.isRecording ? "border-current/30 bg-current/10" : "border-current/15 bg-current/5")}>
          {props.isRecording ? <Square className="size-4" /> : <Mic className="size-4" />}
        </span>
        <span className="min-w-0 space-y-1 text-left leading-tight">
          <span className="block text-[12px] font-semibold uppercase tracking-[0.14em]">{title}</span>
          <span className="block text-[11px] font-medium tracking-[0.08em] opacity-85">{subtitle}</span>
        </span>
      </span>

      <span className={cn("voice-recorder-visualizer", props.isRecording ? "is-recording" : props.isBusy ? "is-busy" : "is-idle")} aria-hidden="true">
        {levels.map((level, index) => {
          const normalizedLevel = Math.min(1, Math.max(0.12, level));

          return (
            <span
              key={`${index}-${normalizedLevel.toFixed(3)}`}
              className="voice-recorder-visualizer-bar"
              style={{
                transform: `scaleY(${normalizedLevel})`
              }}
            />
          );
        })}
      </span>
    </Button>
  );
}
