"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { requestVoiceTransactionDraft } from "./voice-entry.api";
import { VOICE_RECORDING_LIMIT_SECONDS, VOICE_RECORDING_MIN_SECONDS } from "./voice-entry.constants";
import type { VoiceDraftStage, VoiceTransactionDraftResponse } from "./types";

type UseVoiceEntryOptions = {
  token: string;
  onDraftResolved: (draft: VoiceTransactionDraftResponse) => void;
};

const VOICE_VISUALIZER_BAR_COUNT = 5;
const DEFAULT_VISUALIZER_LEVELS = [0.18, 0.26, 0.22, 0.3, 0.2];

function cloneVisualizerLevels(levels: readonly number[]) {
  return Array.from(levels);
}

function buildVisualizerLevels(samples: Uint8Array<ArrayBuffer>) {
  const weights = [0.86, 1, 1.12, 1.02, 0.92];
  const nextLevels: number[] = [];

  for (let index = 0; index < VOICE_VISUALIZER_BAR_COUNT; index += 1) {
    const start = Math.floor((samples.length * index) / VOICE_VISUALIZER_BAR_COUNT);
    const end = Math.max(start + 1, Math.floor((samples.length * (index + 1)) / VOICE_VISUALIZER_BAR_COUNT));

    let sum = 0;
    let count = 0;
    for (let cursor = start; cursor < end; cursor += 1) {
      const centered = Math.abs((samples[cursor] ?? 128) - 128) / 128;
      sum += centered;
      count += 1;
    }

    const average = count > 0 ? sum / count : 0;
    const boosted = Math.pow(average, 0.8) * weights[index] + 0.08;
    nextLevels.push(Math.min(1, Math.max(0.12, boosted)));
  }

  return nextLevels;
}

function getAudioContextConstructor() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext ?? null;
}

function formatRecordingExtension(mimeType: string, filename?: string) {
  const lower = (filename ?? "").toLowerCase();
  if (lower.endsWith(".webm") || mimeType.includes("webm")) return ".webm";
  if (lower.endsWith(".ogg") || mimeType.includes("ogg")) return ".ogg";
  if (lower.endsWith(".mp3") || mimeType.includes("mpeg")) return ".mp3";
  if (lower.endsWith(".m4a") || mimeType.includes("mp4")) return ".m4a";
  if (lower.endsWith(".wav") || mimeType.includes("wav")) return ".wav";
  return ".webm";
}

export function useVoiceEntry(options: UseVoiceEntryOptions) {
  const [stage, setStage] = useState<VoiceDraftStage>("idle");
  const [result, setResult] = useState<VoiceTransactionDraftResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isRecorderSupported, setIsRecorderSupported] = useState(false);
  const [visualizerLevels, setVisualizerLevels] = useState<number[]>(() => cloneVisualizerLevels(DEFAULT_VISUALIZER_LEVELS));

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunkRef = useRef<BlobPart[]>([]);
  const stageTimerRef = useRef<number[]>([]);
  const recordingIntervalRef = useRef<number | null>(null);
  const recordingStopTimerRef = useRef<number | null>(null);
  const recordingStartedAtRef = useRef<number | null>(null);
  const activeRequestIdRef = useRef(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const visualizerAnimationFrameRef = useRef<number | null>(null);
  const visualizerSamplesRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const visualizerActiveRef = useRef(false);

  const isBusy = stage === "processing" || stage === "transcribing" || stage === "parsing";

  const resetVisualizerLevels = useCallback(() => {
    setVisualizerLevels(cloneVisualizerLevels(DEFAULT_VISUALIZER_LEVELS));
  }, []);

  const cleanupAudioGraph = useCallback(() => {
    visualizerActiveRef.current = false;

    if (visualizerAnimationFrameRef.current !== null) {
      window.cancelAnimationFrame(visualizerAnimationFrameRef.current);
      visualizerAnimationFrameRef.current = null;
    }

    if (mediaSourceRef.current) {
      try {
        mediaSourceRef.current.disconnect();
      } catch {}
      mediaSourceRef.current = null;
    }

    if (analyserRef.current) {
      try {
        analyserRef.current.disconnect();
      } catch {}
      analyserRef.current = null;
    }

    visualizerSamplesRef.current = null;

    const audioContext = audioContextRef.current;
    audioContextRef.current = null;
    if (audioContext && audioContext.state !== "closed") {
      void audioContext.close().catch(() => undefined);
    }
  }, []);

  const clearTimers = useCallback(() => {
    for (const timerId of stageTimerRef.current) {
      window.clearTimeout(timerId);
    }
    stageTimerRef.current = [];

    if (recordingIntervalRef.current !== null) {
      window.clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }

    if (recordingStopTimerRef.current !== null) {
      window.clearTimeout(recordingStopTimerRef.current);
      recordingStopTimerRef.current = null;
    }
  }, []);

  const cleanupStream = useCallback(() => {
    cleanupAudioGraph();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
    recordingStartedAtRef.current = null;
    resetVisualizerLevels();
  }, [cleanupAudioGraph, resetVisualizerLevels]);

  const resetDraft = useCallback(() => {
    clearTimers();
    cleanupStream();
    chunkRef.current = [];
    recordingStartedAtRef.current = null;
    setStage("idle");
    setError(null);
    setResult(null);
    setRecordingSeconds(0);
    resetVisualizerLevels();
  }, [clearTimers, cleanupStream, resetVisualizerLevels]);

  const startVisualizer = useCallback(
    async (stream: MediaStream) => {
      cleanupAudioGraph();

      const AudioContextCtor = getAudioContextConstructor();
      if (!AudioContextCtor) {
        resetVisualizerLevels();
        return;
      }

      try {
        const audioContext = new AudioContextCtor();
        audioContextRef.current = audioContext;

        const source = audioContext.createMediaStreamSource(stream);
        mediaSourceRef.current = source;

        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 128;
        analyser.smoothingTimeConstant = 0.85;
        analyserRef.current = analyser;

        source.connect(analyser);

        const samples = new Uint8Array(analyser.fftSize);
        visualizerSamplesRef.current = samples;
        visualizerActiveRef.current = true;

        const sample = () => {
          if (!visualizerActiveRef.current || !analyserRef.current || !visualizerSamplesRef.current) {
            return;
          }

          analyserRef.current.getByteTimeDomainData(visualizerSamplesRef.current);
          setVisualizerLevels(buildVisualizerLevels(visualizerSamplesRef.current));
          visualizerAnimationFrameRef.current = window.requestAnimationFrame(sample);
        };

        visualizerAnimationFrameRef.current = window.requestAnimationFrame(sample);

        if (audioContext.state === "suspended") {
          await audioContext.resume();
        }
      } catch {
        cleanupAudioGraph();
        resetVisualizerLevels();
        return;
      }
    },
    [cleanupAudioGraph, resetVisualizerLevels]
  );

  const submitVoiceBlob = useCallback(async (blob: Blob, filename: string) => {
    const requestId = ++activeRequestIdRef.current;
    setError(null);
    setResult(null);
    setStage("processing");
    setRecordingSeconds(0);
    clearTimers();

    stageTimerRef.current.push(window.setTimeout(() => {
      if (activeRequestIdRef.current === requestId) {
        setStage("transcribing");
      }
    }, 700));

    stageTimerRef.current.push(window.setTimeout(() => {
      if (activeRequestIdRef.current === requestId) {
        setStage("parsing");
      }
    }, 1600));

    try {
      const draft = await requestVoiceTransactionDraft({
        token: options.token,
        file: blob,
        filename
      });

      if (activeRequestIdRef.current !== requestId) {
        return;
      }

      clearTimers();
      setStage("ready");
      setResult(draft);
      options.onDraftResolved(draft);
    } catch (error_) {
      if (activeRequestIdRef.current !== requestId) {
        return;
      }

      clearTimers();
      setStage("error");
      setError(error_ instanceof Error ? error_.message : "Could not process recording");
    }
  }, [clearTimers, options]);

  const finishRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      return;
    }

    recorder.stop();
  }, []);

  const stopRecording = useCallback(() => {
    finishRecording();
  }, [finishRecording]);

  const startRecording = useCallback(async () => {
    if (isBusy || stage === "recording") {
      return;
    }

    if (typeof navigator.mediaDevices?.getUserMedia !== "function" || typeof MediaRecorder === "undefined") {
      setError("Mic unavailable. Use a supported browser or allow microphone access.");
      setStage("error");
      resetVisualizerLevels();
      return;
    }

    try {
      setError(null);
      setResult(null);
      setStage("recording");
      setRecordingSeconds(0);
      chunkRef.current = [];
      recordingStartedAtRef.current = Date.now();
      resetVisualizerLevels();

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      void startVisualizer(stream);

      const preferredMimeTypes = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/ogg"];
      const supportedMimeType = preferredMimeTypes.find((value) => MediaRecorder.isTypeSupported(value)) ?? "";
      const recorder = supportedMimeType ? new MediaRecorder(stream, { mimeType: supportedMimeType }) : new MediaRecorder(stream);
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunkRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const startedAt = recordingStartedAtRef.current;
        recordingStartedAtRef.current = null;
        cleanupStream();
        clearTimers();

        const mimeType = recorder.mimeType || supportedMimeType || "audio/webm";
        const blob = new Blob(chunkRef.current, { type: mimeType });
        const extension = formatRecordingExtension(mimeType);
        chunkRef.current = [];

        if (blob.size === 0) {
          setStage("error");
          setError("No audio detected. Try again.");
          resetVisualizerLevels();
          return;
        }

        if (startedAt !== null && Date.now() - startedAt < VOICE_RECORDING_MIN_SECONDS * 1000) {
          setStage("error");
          setError(`Too short. Speak for at least ${VOICE_RECORDING_MIN_SECONDS} seconds.`);
          resetVisualizerLevels();
          return;
        }

        setStage("processing");

        void submitVoiceBlob(blob, `voice-recording${extension}`);
      };

      recorder.start();

      recordingIntervalRef.current = window.setInterval(() => {
        setRecordingSeconds((current) => {
          if (current + 1 >= VOICE_RECORDING_LIMIT_SECONDS) {
            finishRecording();
            return VOICE_RECORDING_LIMIT_SECONDS;
          }

          return current + 1;
        });
      }, 1000);

      recordingStopTimerRef.current = window.setTimeout(() => {
        finishRecording();
      }, VOICE_RECORDING_LIMIT_SECONDS * 1000);
    } catch (error_) {
      cleanupStream();
      clearTimers();
      setStage("error");
      setError(error_ instanceof Error ? error_.message : "Could not start recording");
      recordingStartedAtRef.current = null;
      resetVisualizerLevels();
    }
  }, [clearTimers, cleanupStream, finishRecording, isBusy, resetVisualizerLevels, stage, startVisualizer, submitVoiceBlob]);

  const stageLabel = useMemo(() => {
    switch (stage) {
      case "recording":
        return `Recording ${String(recordingSeconds).padStart(2, "0")}s`;
      case "processing":
        return "Preparing";
      case "transcribing":
        return "Transcribing";
      case "parsing":
        return "Extracting";
      case "ready":
        return "Ready to save";
      case "error":
        return "Retry";
      default:
        return "Ready to record";
    }
  }, [recordingSeconds, stage]);

  useEffect(() => {
    setIsRecorderSupported(typeof navigator.mediaDevices?.getUserMedia === "function" && typeof MediaRecorder !== "undefined");
  }, []);

  useEffect(() => {
    return () => {
      clearTimers();
      cleanupStream();
      activeRequestIdRef.current += 1;
    };
  }, [clearTimers, cleanupStream]);

  return {
    stage,
    stageLabel,
    result,
    error,
    recordingSeconds,
    isRecorderSupported,
    isBusy,
    visualizerLevels,
    startRecording,
    stopRecording,
    resetDraft
  };
}
