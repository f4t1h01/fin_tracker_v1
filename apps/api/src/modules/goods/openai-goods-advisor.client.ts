import { BadGatewayException } from "@nestjs/common";

import type { AiUsageTokenBreakdown } from "../ai/ai-usage.types";
import { OpenAiRequestError } from "../profile/voice/openai-request-error";
import { OPENAI_GOODS_ADVISOR_MODEL } from "./goods-advisor.constants";
import {
  goodsDinnerAdvisorJsonSchema,
  parseGoodsDinnerAdvisorExtraction,
  type GoodsDinnerAdvisorExtraction
} from "./goods-dinner-advisor.schema";

function readOpenAiErrorMessage(payload: unknown, status: number) {
  if (typeof payload === "object" && payload !== null) {
    const error = (payload as { error?: { message?: unknown } }).error;
    if (error && typeof error.message === "string" && error.message.trim()) {
      return error.message;
    }
  }

  return `OpenAI dinner advisor failed with status ${status}`;
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

  throw new BadGatewayException("OpenAI dinner advisor returned no structured text");
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
    throw new OpenAiRequestError("OpenAI returned an invalid dinner advisor response", {
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

export async function requestGoodsDinnerAdvice(params: {
  apiKey: string;
  userMessage: string;
  pantryContext: string;
  summaryText?: string | null;
  recentConversation?: string;
}): Promise<{
  draft: GoodsDinnerAdvisorExtraction;
  usage: AiUsageTokenBreakdown;
  providerRequestId: string | null;
}> {
  const prompt = [
    "You are a concise dinner advisor for a household pantry app.",
    "Return only JSON that follows the provided schema.",
    "Use the pantry context only. Do not invent tracked ingredients.",
    "Assume basic kitchen equipment, water, oil, salt, pepper, and common spices are available even if not listed.",
    "Return exactly two pantry meals that use tracked goods plus assumed basics.",
    "Return exactly one minimal-buy meal that needs only a very small missing-items list.",
    "Prefer ingredients that are expiring soon when that still makes a sensible dinner.",
    "Avoid expired ingredients unless the user explicitly asks about them.",
    "Keep the answer short, practical, and dinner-focused.",
    "Use the user's language when obvious from their message.",
    "",
    "Conversation summary:",
    params.summaryText?.trim() || "No prior summary.",
    "",
    "Recent conversation:",
    params.recentConversation?.trim() || "No recent conversation.",
    "",
    "User request:",
    params.userMessage,
    "",
    "Pantry context:",
    params.pantryContext
  ].join("\n");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: OPENAI_GOODS_ADVISOR_MODEL,
      input: prompt,
      text: {
        format: {
          type: "json_schema",
          name: "goods_dinner_advisor",
          strict: true,
          schema: goodsDinnerAdvisorJsonSchema
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
    throw new BadGatewayException("OpenAI dinner advisor returned invalid JSON");
  }

  return {
    draft: parseGoodsDinnerAdvisorExtraction(parsed),
    usage,
    providerRequestId
  };
}
