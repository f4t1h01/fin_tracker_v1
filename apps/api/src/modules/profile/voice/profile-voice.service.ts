import { BadRequestException, Injectable, ServiceUnavailableException } from "@nestjs/common";
import type { MultipartFile } from "@fastify/multipart";
import { randomUUID } from "node:crypto";

import { AiUsageService } from "../../ai/ai-usage.service";
import { PrismaService } from "../../prisma/prisma.service";
import { ProfileService } from "../profile.service";
import { extractVoiceTransactionDraft } from "./openai-extraction.client";
import { transcribeVoiceAudio } from "./openai-transcription.client";
import { OpenAiRequestError } from "./openai-request-error";
import { matchVoiceCategory, type VoiceCategoryCatalog } from "./voice-category-matcher";
import type { VoiceTransactionDraftResponse } from "./voice-transaction-draft.schema";
import { OPENAI_EXTRACTION_MODEL, OPENAI_TRANSCRIPTION_MODEL } from "./voice.constants";

@Injectable()
export class ProfileVoiceService {
  private readonly openAiApiKey = process.env.OPENAI_API_KEY?.trim() ?? null;

  constructor(
    private readonly profileService: ProfileService,
    private readonly prisma: PrismaService,
    private readonly aiUsageService: AiUsageService
  ) {}

  async createDraft(userId: string, file: MultipartFile): Promise<VoiceTransactionDraftResponse> {
    if (!this.openAiApiKey) {
      throw new ServiceUnavailableException("Voice drafting is not configured on this server");
    }

    if (!file) {
      throw new BadRequestException("Upload a voice recording first");
    }

    const correlationId = randomUUID();
    const activeBind = await this.prisma.client.coupleBind.findUnique({
      where: { userId },
      select: { coupleId: true }
    });
    const coupleId = activeBind?.coupleId ?? null;

    const transcriptionPricing = this.aiUsageService.getModelPricing(OPENAI_TRANSCRIPTION_MODEL);
    const extractionPricing = this.aiUsageService.getModelPricing(OPENAI_EXTRACTION_MODEL);
    let transcription;

    try {
      transcription = await transcribeVoiceAudio({
        apiKey: this.openAiApiKey,
        file
      });
      await this.aiUsageService.log({
        provider: "OPENAI",
        feature: "VOICE_DRAFT",
        operation: "TRANSCRIPTION",
        status: "SUCCESS",
        model: OPENAI_TRANSCRIPTION_MODEL,
        endpoint: "/v1/audio/transcriptions",
        correlationId,
        providerRequestId: transcription.providerRequestId,
        userId,
        coupleId,
        usage: transcription.usage,
        pricing: transcriptionPricing
      });
    } catch (error) {
      await this.aiUsageService.log({
        provider: "OPENAI",
        feature: "VOICE_DRAFT",
        operation: "TRANSCRIPTION",
        status: "ERROR",
        model: OPENAI_TRANSCRIPTION_MODEL,
        endpoint: "/v1/audio/transcriptions",
        correlationId,
        providerRequestId: error instanceof OpenAiRequestError ? error.details?.providerRequestId ?? null : null,
        userId,
        coupleId,
        usage: error instanceof OpenAiRequestError ? error.details?.usage ?? null : null,
        pricing: transcriptionPricing,
        errorMessage: error instanceof Error ? error.message : "Unknown transcription error"
      });
      throw error;
    }

    const catalog = (await this.profileService.getManagedCategories(userId)) as VoiceCategoryCatalog;
    let extracted;

    try {
      extracted = await extractVoiceTransactionDraft({
        apiKey: this.openAiApiKey,
        transcript: transcription.transcript,
        catalog
      });
      await this.aiUsageService.log({
        provider: "OPENAI",
        feature: "VOICE_DRAFT",
        operation: "EXTRACTION",
        status: "SUCCESS",
        model: OPENAI_EXTRACTION_MODEL,
        endpoint: "/v1/responses",
        correlationId,
        providerRequestId: extracted.providerRequestId,
        userId,
        coupleId,
        usage: extracted.usage,
        pricing: extractionPricing
      });
    } catch (error) {
      await this.aiUsageService.log({
        provider: "OPENAI",
        feature: "VOICE_DRAFT",
        operation: "EXTRACTION",
        status: "ERROR",
        model: OPENAI_EXTRACTION_MODEL,
        endpoint: "/v1/responses",
        correlationId,
        providerRequestId: error instanceof OpenAiRequestError ? error.details?.providerRequestId ?? null : null,
        userId,
        coupleId,
        usage: error instanceof OpenAiRequestError ? error.details?.usage ?? null : null,
        pricing: extractionPricing,
        errorMessage: error instanceof Error ? error.message : "Unknown extraction error"
      });
      throw error;
    }

    const matchedCategory = matchVoiceCategory({
      catalog,
      kind: extracted.draft.kind,
      categoryName: extracted.draft.categoryName
    });

    const missingFields = new Set<string>(extracted.draft.missingFields);
    if (!extracted.draft.kind) {
      missingFields.add("kind");
    }
    if (typeof extracted.draft.amount !== "number") {
      missingFields.add("amount");
    }
    if (!extracted.draft.currency) {
      missingFields.add("currency");
    }
    if (!matchedCategory.categoryId) {
      missingFields.add("category");
    } else {
      missingFields.delete("category");
    }

    const warnings = [...extracted.draft.warnings];
    if (!matchedCategory.categoryId) {
      warnings.push(matchedCategory.categoryNameCandidate ? `No exact category match for "${matchedCategory.categoryNameCandidate}"` : "No category was identified from the voice note");
    }

    return {
      transcript: transcription.transcript,
      draft: {
        kind: extracted.draft.kind,
        amount: extracted.draft.amount,
        currency: extracted.draft.currency,
        categoryId: matchedCategory.categoryId,
        categoryNameCandidate: matchedCategory.categoryId ? null : matchedCategory.categoryNameCandidate,
        note: extracted.draft.note,
        confidence: extracted.draft.confidence,
        missingFields: Array.from(missingFields),
        warnings
      }
    };
  }
}
