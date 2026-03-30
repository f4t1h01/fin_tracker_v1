import { BadGatewayException } from "@nestjs/common";

import { OPENAI_EXTRACTION_MODEL } from "./voice.constants";
import { buildVoiceCategoryContext, type VoiceCategoryCatalog } from "./voice-category-matcher";
import { parseVoiceTransactionExtraction, voiceTransactionExtractionJsonSchema, type VoiceTransactionExtraction } from "./voice-transaction-draft.schema";

function readOpenAiErrorMessage(payload: unknown, status: number) {
  if (typeof payload === "object" && payload !== null) {
    const error = (payload as { error?: { message?: unknown } }).error;
    if (error && typeof error.message === "string" && error.message.trim()) {
      return error.message;
    }
  }

  return `OpenAI extraction failed with status ${status}`;
}

function extractResponsesText(payload: unknown) {
  if (typeof payload === "object" && payload !== null) {
    const record = payload as {
      output_text?: unknown;
      text?: unknown;
      output?: Array<{
        type?: unknown;
        content?: Array<{
          type?: unknown;
          text?: unknown;
        }>;
      }>;
    };

    if (typeof record.output_text === "string" && record.output_text.trim()) {
      return record.output_text.trim();
    }

    if (typeof record.text === "string" && record.text.trim()) {
      return record.text.trim();
    }

    if (Array.isArray(record.output)) {
      for (const item of record.output) {
        if (item?.type !== "message" || !Array.isArray(item.content)) {
          continue;
        }

        for (const content of item.content) {
          if (typeof content?.text === "string" && content.text.trim()) {
            return content.text.trim();
          }
        }
      }
    }
  }

  throw new BadGatewayException("OpenAI extraction returned no structured text");
}

async function readJsonResponse(response: Response) {
  const text = await response.text();
  let payload: unknown;

  try {
    payload = JSON.parse(text);
  } catch {
    throw new BadGatewayException("OpenAI returned an invalid extraction response");
  }

  if (!response.ok) {
    throw new BadGatewayException(readOpenAiErrorMessage(payload, response.status));
  }

  return payload;
}

export async function extractVoiceTransactionDraft(params: {
  apiKey: string;
  transcript: string;
  catalog: VoiceCategoryCatalog;
}): Promise<VoiceTransactionExtraction> {
  const categoryContext = buildVoiceCategoryContext(params.catalog);
  const prompt = [
    "You extract a single finance transaction draft from a voice note.",
    "Return only JSON that follows the provided schema.",
    "Do not invent data.",
    "If the voice note clearly contains more than one transaction, set warnings to explain that the user should split the recording and leave uncertain core fields null.",
    "If a value is missing or unclear, set it to null and add the field name to missingFields.",
    "Only use category names that appear in the visible category context when you can do so confidently.",
    "If no visible category fits, keep categoryName null and let the server/user handle the fallback.",
    "",
    "Visible categories:",
    categoryContext,
    "",
    "Transcript:",
    params.transcript
  ].join("\n");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: OPENAI_EXTRACTION_MODEL,
      input: prompt,
      text: {
        format: {
          type: "json_schema",
          name: "voice_transaction_draft",
          strict: true,
          schema: voiceTransactionExtractionJsonSchema
        }
      }
    })
  });

  const payload = await readJsonResponse(response);
  const outputText = extractResponsesText(payload);

  let parsed: unknown;
  try {
    parsed = JSON.parse(outputText);
  } catch {
    throw new BadGatewayException("OpenAI extraction returned invalid JSON");
  }

  return parseVoiceTransactionExtraction(parsed);
}
