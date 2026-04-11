"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

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

type VisualizerMetrics = {
  width: number;
  barWidth: number;
  gap: number;
};

const MIN_VISUALIZER_BARS = 5;
const MAX_VISUALIZER_BARS = 15;
const DEFAULT_VISUALIZER_METRICS: VisualizerMetrics = {
  width: 0,
  barWidth: 6,
  gap: 5
};

const DEFAULT_VOICE_RECORDER_STYLE: VoiceRecorderStyle = {
  "--voice-recorder-visualizer-height": "44px",
  "--voice-recorder-visualizer-gap": "5px",
  "--voice-recorder-visualizer-bar-width": "6px",
  "--voice-recorder-visualizer-bar-radius": "999px"
};

const DEFAULT_VISUALIZER_LEVELS = Array.from({ length: 24 }, (_, index) => {
  const wave = Math.sin((index / 24) * Math.PI * 2) * 0.07;
  return Math.min(0.42, Math.max(0.16, 0.22 + wave));
});

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function formatRecordingTime(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function resampleVisualizerLevels(levels: readonly number[], targetCount: number) {
  if (targetCount <= 0) {
    return [];
  }

  if (levels.length === 0) {
    return Array.from({ length: targetCount }, () => 0.16);
  }

  if (targetCount === 1) {
    return [levels[0] ?? 0.16];
  }

  if (levels.length === 1) {
    return Array.from({ length: targetCount }, () => levels[0] ?? 0.16);
  }

  return Array.from({ length: targetCount }, (_, index) => {
    const position = (index / (targetCount - 1)) * (levels.length - 1);
    const leftIndex = Math.floor(position);
    const rightIndex = Math.min(levels.length - 1, leftIndex + 1);
    const blend = position - leftIndex;
    const left = levels[leftIndex] ?? 0.16;
    const right = levels[rightIndex] ?? left;

    return left + (right - left) * blend;
  });
}

export function VoiceRecorderButton(props: VoiceRecorderButtonProps) {
  const visualizerTrackRef = useRef<HTMLSpanElement | null>(null);
  const [visualizerMetrics, setVisualizerMetrics] = useState<VisualizerMetrics>(DEFAULT_VISUALIZER_METRICS);

  const levels = props.visualizerLevels.length > 0 ? props.visualizerLevels : DEFAULT_VISUALIZER_LEVELS;
  const title = props.isRecording ? "Stop" : props.isRecorderSupported ? props.isBusy ? "Working" : "Record" : "Mic unavailable";
  const subtitle = props.isRecording
    ? formatRecordingTime(props.recordingSeconds)
    : props.isBusy
      ? props.stageLabel
      : props.isRecorderSupported
        ? `${VOICE_RECORDING_MIN_SECONDS}s min`
        : "Mic unavailable";

  useEffect(() => {
    const node = visualizerTrackRef.current;
    if (!node) {
      return;
    }

    const updateMetrics = () => {
      const width = Math.round(node.getBoundingClientRect().width);
      const styles = window.getComputedStyle(node);
      const barWidth = Number.parseFloat(styles.getPropertyValue("--voice-recorder-visualizer-bar-width")) || DEFAULT_VISUALIZER_METRICS.barWidth;
      const gap = Number.parseFloat(styles.getPropertyValue("--voice-recorder-visualizer-gap")) || DEFAULT_VISUALIZER_METRICS.gap;

      setVisualizerMetrics((current) => {
        if (current.width === width && current.barWidth === barWidth && current.gap === gap) {
          return current;
        }

        return {
          width,
          barWidth,
          gap
        };
      });
    };

    updateMetrics();

    if (typeof ResizeObserver === "undefined") {
      return undefined;
    }

    const observer = new ResizeObserver(() => {
      updateMetrics();
    });

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, []);

  const visualizerBarCount = useMemo(() => {
    if (visualizerMetrics.width <= 0) {
      return MIN_VISUALIZER_BARS;
    }

    const approximate = Math.floor((visualizerMetrics.width + visualizerMetrics.gap) / (visualizerMetrics.barWidth + visualizerMetrics.gap));
    return clamp(approximate, MIN_VISUALIZER_BARS, MAX_VISUALIZER_BARS);
  }, [visualizerMetrics.barWidth, visualizerMetrics.gap, visualizerMetrics.width]);

  const barLevels = useMemo(() => resampleVisualizerLevels(levels, visualizerBarCount), [levels, visualizerBarCount]);

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
      <span className="flex min-w-0 flex-[1.1] items-center gap-3">
        <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-full border", props.isRecording ? "border-current/30 bg-current/10" : "border-current/15 bg-current/5")}>
          {props.isRecording ? <Square className="size-4" /> : <Mic className="size-4" />}
        </span>
        <span className="min-w-0 space-y-1 text-left leading-tight">
          <span className="block text-[12px] font-semibold uppercase tracking-[0.14em]">{title}</span>
          <span className="block text-[11px] font-medium tracking-[0.08em] opacity-85">{subtitle}</span>
        </span>
      </span>

      <span ref={visualizerTrackRef} className={cn("voice-recorder-visualizer flex-1", props.isRecording ? "is-recording" : props.isBusy ? "is-busy" : "is-idle")} aria-hidden="true">
        {barLevels.map((level, index) => {
          const normalizedLevel = clamp(level, 0.12, 1);

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
