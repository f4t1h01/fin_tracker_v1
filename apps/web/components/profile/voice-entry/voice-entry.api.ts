import { webEnv } from "@/lib/env";

import { parseApiResponse } from "../api";
import type { VoiceTransactionDraftResponse } from "./types";

export async function requestVoiceTransactionDraft(params: {
  token: string;
  file: Blob;
  filename: string;
}) {
  const formData = new FormData();
  formData.append("audio", params.file, params.filename);

  const response = await fetch(`${webEnv.apiUrl}/profile/me/voice/draft`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.token}`
    },
    body: formData
  });

  return parseApiResponse<VoiceTransactionDraftResponse>(response);
}
