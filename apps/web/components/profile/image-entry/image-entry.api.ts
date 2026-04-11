import { webEnv } from "@/lib/env";

import { parseApiResponse } from "../api";
import type { ImageTransactionDraftResponse } from "./types";

export async function requestImageTransactionDraft(params: {
  token: string;
  file: Blob;
  filename: string;
}) {
  const formData = new FormData();
  formData.append("image", params.file, params.filename);

  const response = await fetch(`${webEnv.apiUrl}/profile/me/image/draft`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.token}`
    },
    body: formData
  });

  return parseApiResponse<ImageTransactionDraftResponse>(response);
}
