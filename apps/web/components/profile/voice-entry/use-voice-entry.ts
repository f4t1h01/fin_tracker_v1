"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { requestVoiceTransactionDraft } from "./voice-entry.api";
import { VOICE_RECORDING_LIMIT_SECONDS, VOICE_RECORDING_MIN_SECONDS } from "./voice-entry.constants";
import type { VoiceDraftStage, VoiceTransactionDraftResponse } from "./types";

type UseVoiceEntryOptions = {
  token: string;
  onDraftResolved: (draft: VoiceTransactionDraftResponse) => void;
};

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

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunkRef = useRef<BlobPart[]>([]);
  const stageTimerRef = useRef<number[]>([]);
  const recordingIntervalRef = useRef<number | null>(null);
  const recordingStopTimerRef = useRef<number | null>(null);
  const recordingStartedAtRef = useRef<number | null>(null);
  const activeRequestIdRef = useRef(0);

  const isBusy = stage === "processing" || stage === "transcribing" || stage === "parsing";

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
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
  }, []);

  const resetDraft = useCallback(() => {
    clearTimers();
    cleanupStream();
    chunkRef.current = [];
    recordingStartedAtRef.current = null;
    setStage("idle");
    setError(null);
    setResult(null);
    setRecordingSeconds(0);
  }, [clearTimers, cleanupStream]);

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
      setError(error_ instanceof Error ? error_.message : "Could not process the voice recording");
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
      setError("Voice recording is not supported in this browser. Check microphone permissions or use a supported browser.");
      setStage("error");
      return;
    }

    try {
      setError(null);
      setResult(null);
      setStage("recording");
      setRecordingSeconds(0);
      chunkRef.current = [];
      recordingStartedAtRef.current = Date.now();

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

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
          setError("Recording finished without audio content");
          return;
        }

        if (startedAt !== null && Date.now() - startedAt < VOICE_RECORDING_MIN_SECONDS * 1000) {
          setStage("error");
          setError(`Recording is too short. Please speak for at least ${VOICE_RECORDING_MIN_SECONDS} seconds.`);
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
      setError(error_ instanceof Error ? error_.message : "Could not start voice recording");
    }
  }, [clearTimers, cleanupStream, finishRecording, isBusy, stage, submitVoiceBlob]);

  const stageLabel = useMemo(() => {
    switch (stage) {
      case "recording":
        return `Recording ${String(recordingSeconds).padStart(2, "0")}s / ${VOICE_RECORDING_LIMIT_SECONDS}s`;
      case "processing":
        return "Preparing voice note...";
      case "transcribing":
        return "Transcribing speech...";
      case "parsing":
        return "Extracting transaction fields...";
      case "ready":
        return "Voice draft ready.";
      case "error":
        return error ?? "Voice drafting failed.";
      default:
        return "Press the button to record a short voice note.";
    }
  }, [error, recordingSeconds, stage]);

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
    startRecording,
    stopRecording,
    resetDraft
  };
}
