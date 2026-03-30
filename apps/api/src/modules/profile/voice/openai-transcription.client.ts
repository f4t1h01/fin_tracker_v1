import { BadGatewayException } from "@nestjs/common";
import type { MultipartFile } from "@fastify/multipart";
import { createWriteStream, openAsBlob } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { pipeline } from "node:stream/promises";

import { OPENAI_TRANSCRIPTION_MODEL } from "./voice.constants";

async function readJsonResponse(response: Response) {
  const text = await response.text();
  let payload: unknown;

  try {
    payload = JSON.parse(text);
  } catch {
    throw new BadGatewayException("OpenAI returned an invalid transcription response");
  }

  if (!response.ok) {
    const message = typeof payload === "object" && payload !== null && "error" in payload && typeof (payload as { error?: { message?: unknown } }).error?.message === "string"
      ? (payload as { error: { message: string } }).error.message
      : `OpenAI transcription failed with status ${response.status}`;
    throw new BadGatewayException(message);
  }

  return payload;
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

export async function transcribeVoiceAudio(params: {
  apiKey: string;
  file: MultipartFile;
}) {
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

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${params.apiKey}`
      },
      body: form
    });

    const payload = await readJsonResponse(response);
    const transcript = typeof payload === "object" && payload !== null && "text" in payload && typeof (payload as { text?: unknown }).text === "string"
      ? (payload as { text: string }).text.trim()
      : "";

    if (!transcript) {
      throw new BadGatewayException("Voice transcription returned no text");
    }

    return transcript;
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}
