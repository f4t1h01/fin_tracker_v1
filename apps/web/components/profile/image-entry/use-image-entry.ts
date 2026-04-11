"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { requestImageTransactionDraft } from "./image-entry.api";
import type { ImageDraftStage, ImageTransactionDraftResponse } from "./types";

type UseImageEntryOptions = {
  token: string;
  onDraftResolved: (draft: ImageTransactionDraftResponse) => void;
};

const nonRenderableExtensions = new Set([".heic", ".heif"]);

function canRenderPreview(file: Blob, filename: string) {
  if (file.type === "image/heic" || file.type === "image/heif") {
    return false;
  }

  const lowerName = filename.toLowerCase();
  for (const extension of nonRenderableExtensions) {
    if (lowerName.endsWith(extension)) {
      return false;
    }
  }

  return file.type.startsWith("image/");
}

function blobToPreviewUrl(blob: Blob) {
  return URL.createObjectURL(blob);
}

async function captureVideoFrame(video: HTMLVideoElement) {
  const width = video.videoWidth || 0;
  const height = video.videoHeight || 0;
  if (width <= 0 || height <= 0) {
    throw new Error("Camera preview is not ready yet");
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Could not access the capture canvas");
  }

  context.drawImage(video, 0, 0, width, height);
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Could not capture a camera image"));
          return;
        }

        resolve(blob);
      },
      "image/jpeg",
      0.92
    );
  });
}

export function useImageEntry(options: UseImageEntryOptions) {
  const [stage, setStage] = useState<ImageDraftStage>("idle");
  const [result, setResult] = useState<ImageTransactionDraftResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState<string | null>(null);
  const [isPreviewRenderable, setIsPreviewRenderable] = useState(false);
  const [isCameraSupported, setIsCameraSupported] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const requestIdRef = useRef(0);
  const timersRef = useRef<number[]>([]);

  const isBusy = stage === "uploading" || stage === "preprocessing" || stage === "analyzing";

  const clearTimers = useCallback(() => {
    for (const timer of timersRef.current) {
      window.clearTimeout(timer);
    }
    timersRef.current = [];
  }, []);

  const revokePreview = useCallback(() => {
    setPreviewUrl((current) => {
      if (current) {
        URL.revokeObjectURL(current);
      }
      return null;
    });
  }, []);

  const stopCapture = useCallback((nextStage: ImageDraftStage = "idle") => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setStage((current) => (current === "capturing" ? nextStage : current));
  }, []);

  const preparePreview = useCallback((blob: Blob, filename: string) => {
    revokePreview();
    setPreviewName(filename);

    if (canRenderPreview(blob, filename)) {
      setPreviewUrl(blobToPreviewUrl(blob));
      setIsPreviewRenderable(true);
      return;
    }

    setIsPreviewRenderable(false);
  }, [revokePreview]);

  const submitImageBlob = useCallback(async (blob: Blob, filename: string) => {
    const requestId = ++requestIdRef.current;
    clearTimers();
    setError(null);
    setResult(null);
    setStage("uploading");

    timersRef.current.push(window.setTimeout(() => {
      if (requestIdRef.current === requestId) {
        setStage("preprocessing");
      }
    }, 350));

    timersRef.current.push(window.setTimeout(() => {
      if (requestIdRef.current === requestId) {
        setStage("analyzing");
      }
    }, 1200));

    try {
      const draft = await requestImageTransactionDraft({
        token: options.token,
        file: blob,
        filename
      });

      if (requestIdRef.current !== requestId) {
        return;
      }

      clearTimers();
      setStage("ready");
      setResult(draft);
      options.onDraftResolved(draft);
    } catch (error_) {
      if (requestIdRef.current !== requestId) {
        return;
      }

      clearTimers();
      setStage("error");
      setError(error_ instanceof Error ? error_.message : "Could not process the receipt image");
    }
  }, [clearTimers, options]);

  const selectFile = useCallback((file: File | null) => {
    if (!file || isBusy) {
      return;
    }

    stopCapture("idle");
    preparePreview(file, file.name);
    void submitImageBlob(file, file.name);
  }, [isBusy, preparePreview, stopCapture, submitImageBlob]);

  const startCapture = useCallback(async () => {
    if (isBusy || stage === "capturing") {
      return;
    }

    if (typeof navigator.mediaDevices?.getUserMedia !== "function") {
      setStage("error");
      setError("Camera unavailable. Upload a receipt image instead.");
      return;
    }

    try {
      setError(null);
      setResult(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: {
            ideal: "environment"
          }
        },
        audio: false
      });

      streamRef.current = stream;
      setStage("capturing");

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
    } catch (error_) {
      setStage("error");
      setError(error_ instanceof Error ? error_.message : "Could not open the camera");
    }
  }, [isBusy, stage]);

  const captureImage = useCallback(async () => {
    if (!videoRef.current || stage !== "capturing" || isBusy) {
      return;
    }

    try {
      const blob = await captureVideoFrame(videoRef.current);
      const filename = `receipt-capture-${Date.now()}.jpg`;
      preparePreview(blob, filename);
      stopCapture("idle");
      void submitImageBlob(blob, filename);
    } catch (error_) {
      setStage("error");
      setError(error_ instanceof Error ? error_.message : "Could not capture the receipt image");
    }
  }, [isBusy, preparePreview, stage, stopCapture, submitImageBlob]);

  const resetDraft = useCallback(() => {
    requestIdRef.current += 1;
    clearTimers();
    stopCapture("idle");
    revokePreview();
    setPreviewName(null);
    setIsPreviewRenderable(false);
    setStage("idle");
    setResult(null);
    setError(null);
  }, [clearTimers, revokePreview, stopCapture]);

  const stageLabel = useMemo(() => {
    switch (stage) {
      case "capturing":
        return "Camera ready";
      case "uploading":
        return "Uploading";
      case "preprocessing":
        return "Cleaning image";
      case "analyzing":
        return "Extracting receipt";
      case "ready":
        return "Ready to save";
      case "error":
        return "Retry";
      default:
        return "Ready to scan";
    }
  }, [stage]);

  useEffect(() => {
    setIsCameraSupported(typeof navigator.mediaDevices?.getUserMedia === "function");
  }, []);

  useEffect(() => {
    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      void videoRef.current.play().catch(() => undefined);
    }
  }, [stage]);

  useEffect(() => {
    return () => {
      requestIdRef.current += 1;
      clearTimers();
      stopCapture("idle");
      revokePreview();
    };
  }, [clearTimers, revokePreview, stopCapture]);

  return {
    stage,
    stageLabel,
    result,
    error,
    previewUrl,
    previewName,
    isPreviewRenderable,
    isCameraSupported,
    isBusy,
    videoRef,
    startCapture,
    captureImage,
    cancelCapture: () => stopCapture("idle"),
    selectFile,
    resetDraft
  };
}
