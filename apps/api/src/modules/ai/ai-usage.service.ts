import { Injectable } from "@nestjs/common";
import { type AiModelPricing } from "@repo/config";

import { PrismaService } from "../prisma/prisma.service";
import type { AiUsageLogPayload, AiUsageTokenBreakdown } from "./ai-usage.types";

function normalizeCount(value: number | null | undefined) {
  if (!Number.isFinite(value)) {
    return null;
  }

  return Math.max(0, Math.trunc(value as number));
}

function toBigInt(value: number | bigint | null | undefined) {
  if (typeof value === "bigint") {
    return value;
  }

  if (!Number.isFinite(value)) {
    return null;
  }

  return BigInt(Math.trunc(value as number));
}

function computeMicros(tokens: number | null, unitPriceMicrosPer1m: bigint | null | undefined) {
  if (!tokens || !unitPriceMicrosPer1m) {
    return 0n;
  }

  return (BigInt(tokens) * unitPriceMicrosPer1m) / 1000000n;
}

@Injectable()
export class AiUsageService {
  constructor(private readonly prisma: PrismaService) {}

  async getModelPricing(model: string): Promise<AiModelPricing | null> {
    const pricing = await this.prisma.client.aiModelPricing.findFirst({
      where: {
        provider: "OPENAI",
        model,
        retiredAt: null
      },
      orderBy: [{ effectiveFrom: "desc" }, { createdAt: "desc" }]
    });

    if (!pricing) {
      return null;
    }

    return {
      id: pricing.id,
      textInputMicrosPer1m: pricing.textInputMicrosPer1m ?? undefined,
      audioInputMicrosPer1m: pricing.audioInputMicrosPer1m ?? undefined,
      textOutputMicrosPer1m: pricing.textOutputMicrosPer1m ?? undefined,
      audioOutputMicrosPer1m: pricing.audioOutputMicrosPer1m ?? undefined
    };
  }

  async log(payload: AiUsageLogPayload) {
    const usage: AiUsageTokenBreakdown = payload.usage ?? {};
    const pricing = payload.pricing ?? null;
    const inputTokens = normalizeCount(usage.inputTokens ?? null);
    const outputTokens = normalizeCount(usage.outputTokens ?? null);
    const totalTokens = normalizeCount(usage.totalTokens ?? null);
    const inputTextTokens = normalizeCount(usage.inputTextTokens ?? null);
    const inputAudioTokens = normalizeCount(usage.inputAudioTokens ?? null);
    const inputCachedTokens = normalizeCount(usage.inputCachedTokens ?? null);
    const outputTextTokens = normalizeCount(usage.outputTextTokens ?? null);
    const outputAudioTokens = normalizeCount(usage.outputAudioTokens ?? null);

    const textInputPriceMicrosPer1m = toBigInt(pricing?.textInputMicrosPer1m);
    const audioInputPriceMicrosPer1m = toBigInt(pricing?.audioInputMicrosPer1m);
    const textOutputPriceMicrosPer1m = toBigInt(pricing?.textOutputMicrosPer1m);
    const audioOutputPriceMicrosPer1m = toBigInt(pricing?.audioOutputMicrosPer1m);

    const inputCostMicros =
      computeMicros(inputTextTokens, textInputPriceMicrosPer1m) +
      computeMicros(inputAudioTokens, audioInputPriceMicrosPer1m);
    const outputCostMicros =
      computeMicros(outputTextTokens, textOutputPriceMicrosPer1m) +
      computeMicros(outputAudioTokens, audioOutputPriceMicrosPer1m);
    const totalCostMicros = inputCostMicros + outputCostMicros;

    await this.prisma.client.aiUsageLog.create({
      data: {
        provider: payload.provider,
        feature: payload.feature,
        operation: payload.operation,
        status: payload.status,
        model: payload.model,
        endpoint: payload.endpoint,
        correlationId: payload.correlationId,
        providerRequestId: payload.providerRequestId ?? null,
        userId: payload.userId ?? null,
        coupleId: payload.coupleId ?? null,
        aiThreadId: payload.aiThreadId ?? null,
        aiModelPricingId: payload.pricingId ?? payload.pricing?.id ?? null,
        inputTokens,
        outputTokens,
        totalTokens,
        inputTextTokens,
        inputAudioTokens,
        inputCachedTokens,
        outputTextTokens,
        outputAudioTokens,
        textInputPriceMicrosPer1m,
        audioInputPriceMicrosPer1m,
        textOutputPriceMicrosPer1m,
        audioOutputPriceMicrosPer1m,
        inputCostMicros,
        outputCostMicros,
        totalCostMicros,
        errorMessage: payload.errorMessage ?? null
      }
    });
  }
}
