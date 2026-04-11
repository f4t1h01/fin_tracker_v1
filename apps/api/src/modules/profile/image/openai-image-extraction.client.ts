import { BadGatewayException } from "@nestjs/common";

import type { AiUsageTokenBreakdown } from "../../ai/ai-usage.types";
import { OpenAiRequestError } from "../voice/openai-request-error";
import { buildVoiceCategoryContext, type VoiceCategoryCatalog } from "../voice/voice-category-matcher";
import { imageTransactionExtractionJsonSchema, parseImageTransactionExtraction, type ImageTransactionExtraction } from "./image-transaction-draft.schema";
import { OPENAI_IMAGE_EXTRACTION_MODEL } from "./image.constants";

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

function toDataUrl(buffer: Buffer, mimeType: string) {
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}

export async function extractImageTransactionDraft(params: {
  apiKey: string;
  catalog: VoiceCategoryCatalog;
  primaryImage: {
    buffer: Buffer;
    mimeType: string;
  };
  secondaryImage?: {
    buffer: Buffer;
    mimeType: string;
  } | null;
}): Promise<{
  draft: ImageTransactionExtraction;
  usage: AiUsageTokenBreakdown;
  providerRequestId: string | null;
}> {
  const categoryContext = buildVoiceCategoryContext(params.catalog);
  const prompt = [
    "You extract a single finance transaction draft from a receipt or finance image.",
    "Return only JSON that follows the provided schema.",
    "Do not invent data.",
    "Receipts, invoices, bills, and finance screenshots are usually EXPENSE unless the image clearly shows income or a deposit.",
    "Extract the final payable total including taxes, service charges, and other visible charges.",
    "Prefer lines such as TOTAL, GRAND TOTAL, AMOUNT DUE, or the final paid amount over subtotal.",
    "If the image is incomplete and the final total cannot be identified, leave amount null, add amount to missingFields, and include INCOMPLETE_TOTAL in qualityIssues.",
    "Determine whether the receipt is SINGLE_ITEM, MULTI_ITEM, or UNKNOWN.",
    "Return productNames only for actual product or service names when they are visible. Do not use merchant names as productNames unless that is all the image contains.",
    "Return a short summary that can be used as a fallback note when the productNames list is noisy or too long.",
    "Only use category names that appear in the visible category context when you can do so confidently.",
    "If no visible category fits, keep categoryName null and let the server/user handle the fallback.",
    "If the image is not a finance document or contains multiple unrelated records, explain that in warnings and qualityIssues.",
    "",
    "Visible categories:",
    categoryContext
  ].join("\n");

  const content: Array<Record<string, unknown>> = [
    {
      type: "input_text",
      text: prompt
    },
    {
      type: "input_image",
      image_url: toDataUrl(params.primaryImage.buffer, params.primaryImage.mimeType),
      detail: "high"
    }
  ];

  if (params.secondaryImage) {
    content.push({
      type: "input_image",
      image_url: toDataUrl(params.secondaryImage.buffer, params.secondaryImage.mimeType),
      detail: "high"
    });
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: OPENAI_IMAGE_EXTRACTION_MODEL,
      input: [
        {
          role: "user",
          content
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "image_transaction_draft",
          strict: true,
          schema: imageTransactionExtractionJsonSchema
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
    draft: parseImageTransactionExtraction(parsed),
    usage,
    providerRequestId
  };
}
