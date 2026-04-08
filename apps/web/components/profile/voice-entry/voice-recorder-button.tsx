"use client";

import { Mic, Square } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

import { VOICE_RECORDING_MIN_SECONDS } from "./voice-entry.constants";

type VoiceRecorderButtonProps = {
  isRecording: boolean;
  isBusy: boolean;
  isRecorderSupported: boolean;
  recordingSeconds: number;
  onStartRecording: () => void;
  onStopRecording: () => void;
};

export function VoiceRecorderButton(props: VoiceRecorderButtonProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="outline"
        disabled={props.isBusy || (!props.isRecorderSupported && !props.isRecording)}
        className={cn(
          "h-auto min-h-12 justify-start gap-3 rounded-full border-[rgba(201,168,76,0.24)] px-2.5 py-2 text-left shadow-none transition-colors hover:border-[var(--gold)] hover:text-[var(--ink)]",
          props.isRecording ? "border-rose-400/50 bg-rose-500/15 text-rose-700 hover:border-rose-400/70 hover:text-rose-700 dark:text-rose-100 dark:hover:text-rose-100" : "bg-[color-mix(in_srgb,var(--warm-white)_84%,transparent)]"
        )}
        aria-pressed={props.isRecording}
        aria-label={props.isRecording ? "Stop voice recording" : "Start voice recording"}
        onClick={props.isRecording ? props.onStopRecording : props.onStartRecording}
        >
        <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full border", props.isRecording ? "border-current/30 bg-current/10" : "border-current/15 bg-current/5")}>
          {props.isRecording ? <Square className="size-4" /> : <Mic className="size-4" />}
        </span>
        <span className="flex min-w-0 flex-1 flex-col items-start text-left leading-none">
          <span className="text-[12px] font-semibold tracking-[0.1em] uppercase">{props.isRecording ? "Stop" : props.isRecorderSupported ? "Record" : "Unavailable"}</span>
          <span className="mt-1 flex items-center gap-2 text-[11px] font-medium tracking-[0.08em] opacity-85">
            {props.isRecording ? (
              <>
                <span className="voice-recorder-meter" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </span>
                <span>{String(Math.floor(props.recordingSeconds / 60)).padStart(2, "0")}:{String(props.recordingSeconds % 60).padStart(2, "0")}</span>
              </>
            ) : (
              <span>{VOICE_RECORDING_MIN_SECONDS}s min</span>
            )}
          </span>
        </span>
      </Button>
    </div>
  );
}
