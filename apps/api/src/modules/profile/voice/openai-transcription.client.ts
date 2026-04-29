import { BadGatewayException, GatewayTimeoutException } from "@nestjs/common";
import type { MultipartFile } from "@fastify/multipart";
import { createWriteStream, openAsBlob } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { pipeline } from "node:stream/promises";

import type { AiUsageTokenBreakdown } from "../../ai/ai-usage.types";
import { OpenAiRequestError } from "./openai-request-error";
import { OPENAI_TRANSCRIPTION_MODEL } from "./voice.constants";

const OPENAI_TRANSCRIPTION_TIMEOUT_MS = 90_000;

function createTimeoutSignal(timeoutMs: number) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  return {
    signal: controller.signal,
    clear: () => clearTimeout(timeoutId)
  };
}

function isAbortError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    error.name === "AbortError"
  );
}

async function readJsonResponse(response: Response) {
  const text = await response.text();
  let payload: unknown;
  const providerRequestId = response.headers.get("x-request-id");

  try {
    payload = JSON.parse(text);
  } catch {
    throw new OpenAiRequestError("OpenAI returned an invalid transcription response", {
      providerRequestId
    });
  }

  const usage = extractUsage(payload);

  if (!response.ok) {
    const message = typeof payload === "object" && payload !== null && "error" in payload && typeof (payload as { error?: { message?: unknown } }).error?.message === "string"
      ? (payload as { error: { message: string } }).error.message
      : `OpenAI transcription failed with status ${response.status}`;
    throw new OpenAiRequestError(message, {
      usage,
      providerRequestId
    });
  }

  return {
    payload,
    usage,
    providerRequestId:
      providerRequestId ??
      (typeof payload === "object" && payload !== null && "id" in payload && typeof (payload as { id?: unknown }).id === "string"
        ? (payload as { id: string }).id
        : null)
  };
}

function resolveVoiceExtension(filename: string, mimetype: string) {
  const lowerName = filename.toLowerCase();
  if (lowerName.endsWith(".webm") || mimetype.includes("webm")) {
    return ".webm";
  }

  if (lowerName.endsWith(".ogg") || mimetype.includes("ogg")) {
    return ".ogg";
  }

  if (lowerName.endsWith(".mp3") || mimetype.includes("mpeg")) {
    return ".mp3";
  }

  if (lowerName.endsWith(".m4a") || mimetype.includes("mp4")) {
    return ".m4a";
  }

  if (lowerName.endsWith(".wav") || mimetype.includes("wav")) {
    return ".wav";
  }

  return ".webm";
}

function extractUsage(payload: unknown): AiUsageTokenBreakdown {
  if (typeof payload !== "object" || payload === null) {
    return {};
  }

  const usage = (payload as {
    usage?: {
      input_tokens?: unknown;
      output_tokens?: unknown;
      total_tokens?: unknown;
      input_token_details?: {
        text_tokens?: unknown;
        audio_tokens?: unknown;
        cached_tokens?: unknown;
      };
      output_token_details?: {
        text_tokens?: unknown;
        audio_tokens?: unknown;
      };
      input_tokens_details?: {
        text_tokens?: unknown;
        audio_tokens?: unknown;
        cached_tokens?: unknown;
      };
      output_tokens_details?: {
        text_tokens?: unknown;
        audio_tokens?: unknown;
      };
    };
  }).usage;

  if (!usage || typeof usage !== "object") {
    return {};
  }

  const inputDetails = usage.input_token_details ?? usage.input_tokens_details;
  const outputDetails = usage.output_token_details ?? usage.output_tokens_details;
  const inputTokens = typeof usage.input_tokens === "number" ? usage.input_tokens : null;
  const outputTokens = typeof usage.output_tokens === "number" ? usage.output_tokens : null;
  const totalTokens = typeof usage.total_tokens === "number" ? usage.total_tokens : null;

  return {
    inputTokens,
    outputTokens,
    totalTokens,
    inputTextTokens: typeof inputDetails?.text_tokens === "number" ? inputDetails.text_tokens : null,
    inputAudioTokens: typeof inputDetails?.audio_tokens === "number" ? inputDetails.audio_tokens : inputTokens,
    inputCachedTokens: typeof inputDetails?.cached_tokens === "number" ? inputDetails.cached_tokens : null,
    outputTextTokens: typeof outputDetails?.text_tokens === "number" ? outputDetails.text_tokens : outputTokens,
    outputAudioTokens: typeof outputDetails?.audio_tokens === "number" ? outputDetails.audio_tokens : null
  };
}

export async function transcribeVoiceAudio(params: {
  apiKey: string;
  file: MultipartFile;
}): Promise<{
  transcript: string;
  usage: AiUsageTokenBreakdown;
  providerRequestId: string | null;
}> {
  const tempDir = await mkdtemp(join(tmpdir(), "fin-tracker-voice-"));
  const extension = resolveVoiceExtension(params.file.filename, params.file.mimetype ?? "");
  const tempPath = join(tempDir, `${randomUUID()}${extension}`);

  try {
    await pipeline(params.file.file, createWriteStream(tempPath));

    const blob = await openAsBlob(tempPath, {
      type: params.file.mimetype || "application/octet-stream"
    });

    const form = new FormData();
    form.append("file", blob, params.file.filename || `voice-recording${extension}`);
    form.append("model", OPENAI_TRANSCRIPTION_MODEL);
    form.append("response_format", "json");
    form.append("prompt", "Finance transaction voice note with amounts, currencies, and categories.");

    const timeout = createTimeoutSignal(OPENAI_TRANSCRIPTION_TIMEOUT_MS);
    let response: Response;

    try {
      response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${params.apiKey}`
        },
        body: form,
        signal: timeout.signal
      });
    } catch (error) {
      if (isAbortError(error)) {
        throw new GatewayTimeoutException("Voice transcription timed out. Try a shorter recording.");
      }

      throw error;
    } finally {
      timeout.clear();
    }

    const { payload, usage, providerRequestId } = await readJsonResponse(response);
    const transcript = typeof payload === "object" && payload !== null && "text" in payload && typeof (payload as { text?: unknown }).text === "string"
      ? (payload as { text: string }).text.trim()
      : "";

    if (!transcript) {
      throw new BadGatewayException("Voice transcription returned no text");
    }

    return {
      transcript,
      usage,
      providerRequestId
    };
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}
