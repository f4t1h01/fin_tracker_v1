import { webEnv } from "@/lib/env";

import { parseApiResponse } from "../api";
import type { VoiceTransactionDraftResponse } from "./types";
import { VOICE_TRANSCRIPTION_TIMEOUT_MS } from "./voice-entry.constants";

export async function requestVoiceTransactionDraft(params: {
  token: string;
  file: Blob;
  filename: string;
}) {
  const formData = new FormData();
  formData.append("audio", params.file, params.filename);
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => {
    controller.abort();
  }, VOICE_TRANSCRIPTION_TIMEOUT_MS);

  try {
    const response = await fetch(`${webEnv.apiUrl}/profile/me/voice/draft`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${params.token}`
      },
      body: formData,
      signal: controller.signal
    });

    return parseApiResponse<VoiceTransactionDraftResponse>(response);
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "name" in error &&
      error.name === "AbortError"
    ) {
      throw new Error("Voice transcription timed out. Try a shorter recording.");
    }

    throw error;
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
}
