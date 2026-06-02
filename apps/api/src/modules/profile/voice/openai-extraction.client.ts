import { BadGatewayException } from "@nestjs/common";

import type { AiUsageTokenBreakdown } from "../../ai/ai-usage.types";
import { OpenAiRequestError } from "./openai-request-error";
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
  const providerRequestId = response.headers.get("x-request-id");

  try {
    payload = JSON.parse(text);
  } catch {
    throw new OpenAiRequestError("OpenAI returned an invalid extraction response", {
      providerRequestId
    });
  }

  const usage = extractUsage(payload);

  if (!response.ok) {
    throw new OpenAiRequestError(readOpenAiErrorMessage(payload, response.status), {
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

function extractUsage(payload: unknown): AiUsageTokenBreakdown {
  if (typeof payload !== "object" || payload === null) {
    return {};
  }

  const usage = (payload as {
    usage?: {
      input_tokens?: unknown;
      output_tokens?: unknown;
      total_tokens?: unknown;
      input_tokens_details?: {
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

  const inputTokens = typeof usage.input_tokens === "number" ? usage.input_tokens : null;
  const outputTokens = typeof usage.output_tokens === "number" ? usage.output_tokens : null;
  const totalTokens = typeof usage.total_tokens === "number" ? usage.total_tokens : null;
  const outputTextTokens = typeof usage.output_tokens_details?.text_tokens === "number" ? usage.output_tokens_details.text_tokens : outputTokens;
  const outputAudioTokens = typeof usage.output_tokens_details?.audio_tokens === "number" ? usage.output_tokens_details.audio_tokens : null;
  const inputCachedTokens = typeof usage.input_tokens_details?.cached_tokens === "number" ? usage.input_tokens_details.cached_tokens : null;

  return {
    inputTokens,
    outputTokens,
    totalTokens,
    inputTextTokens: inputTokens,
    inputCachedTokens,
    outputTextTokens,
    outputAudioTokens
  };
}

export async function extractVoiceTransactionDraft(params: {
  apiKey: string;
  transcript: string;
  catalog: VoiceCategoryCatalog;
}): Promise<{
  draft: VoiceTransactionExtraction;
  usage: AiUsageTokenBreakdown;
  providerRequestId: string | null;
}> {
  const categoryContext = buildVoiceCategoryContext(params.catalog);
  const prompt = [
    "You extract a single finance transaction draft from a voice note.",
    "Return only JSON that follows the provided schema.",
    "Do not invent data.",
    "Classify purchases, payments, bills, transfers out, and shopping as EXPENSE.",
    "Classify salary, cash received, deposits, refunds received, and transfers in as INCOME only when the transcript clearly says money came in.",
    "If the user says an amount with thousand or million words such as ming, thousand, тыс, million, or млн, expand it to the full numeric amount.",
    "If no currency is spoken but the amount sounds like local everyday spending, use UZS.",
    "Use USD, EUR, RUB, KZT, TRY, AED, or another supported currency only when the transcript explicitly mentions that currency.",
    "Treat short Uzbek/Russian/English finance speech as normal: so'm/som/soum/сум means UZS, dollar/доллар means USD, rubl/рубль means RUB.",
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

  const { payload, usage, providerRequestId } = await readJsonResponse(response);
  const outputText = extractResponsesText(payload);

  let parsed: unknown;
  try {
    parsed = JSON.parse(outputText);
  } catch {
    throw new BadGatewayException("OpenAI extraction returned invalid JSON");
  }

  return {
    draft: parseVoiceTransactionExtraction(parsed),
    usage,
    providerRequestId
  };
}
