import type { AiModelPricing } from "@repo/config";

export type AiUsageTokenBreakdown = {
  inputTokens?: number | null;
  outputTokens?: number | null;
  totalTokens?: number | null;
  inputTextTokens?: number | null;
  inputAudioTokens?: number | null;
  inputCachedTokens?: number | null;
  outputTextTokens?: number | null;
  outputAudioTokens?: number | null;
};

export type AiUsageLogPayload = {
  provider: string;
  feature: string;
  operation: string;
  status: string;
  model: string;
  endpoint: string;
  correlationId: string;
  providerRequestId?: string | null;
  userId?: string | null;
  coupleId?: string | null;
  usage?: AiUsageTokenBreakdown | null;
  pricing?: AiModelPricing | null;
  errorMessage?: string | null;
};
