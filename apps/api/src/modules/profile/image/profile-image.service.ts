import { BadRequestException, Injectable, ServiceUnavailableException } from "@nestjs/common";
import type { MultipartFile } from "@fastify/multipart";
import { randomUUID } from "node:crypto";

import { AiUsageService } from "../../ai/ai-usage.service";
import { PrismaService } from "../../prisma/prisma.service";
import { ProfileService } from "../profile.service";
import { OpenAiRequestError } from "../voice/openai-request-error";
import type { VoiceCategoryCatalog } from "../voice/voice-category-matcher";
import { extractImageTransactionDraft } from "./openai-image-extraction.client";
import { preprocessReceiptImage } from "./receipt-preprocess.client";
import { finalizeImageDraft } from "./image-draft-finalizer";
import { resolveQrReceiptDraft } from "./qr-receipt-resolver";
import type { ImageTransactionDraftResponse } from "./image-transaction-draft.schema";
import { OPENAI_IMAGE_EXTRACTION_MODEL } from "./image.constants";

@Injectable()
export class ProfileImageService {
  private readonly openAiApiKey = process.env.OPENAI_API_KEY?.trim() ?? null;

  constructor(
    private readonly profileService: ProfileService,
    private readonly prisma: PrismaService,
    private readonly aiUsageService: AiUsageService
  ) {}

  async createDraft(userId: string, file: MultipartFile): Promise<ImageTransactionDraftResponse> {
    if (!this.openAiApiKey) {
      throw new ServiceUnavailableException("Image drafting is not configured on this server");
    }

    if (!file) {
      throw new BadRequestException("Upload a receipt image first");
    }

    const correlationId = randomUUID();
    const activeBind = await this.prisma.client.coupleBind.findUnique({
      where: { userId },
      select: { coupleId: true }
    });
    const coupleId = activeBind?.coupleId ?? null;

    const preprocessing = await preprocessReceiptImage(file);
    const catalog = (await this.profileService.getManagedCategories(userId)) as VoiceCategoryCatalog;

    const qrResult = await resolveQrReceiptDraft(preprocessing.qrUrl);
    if (qrResult.ok) {
      return finalizeImageDraft({
        catalog,
        extracted: qrResult.extracted,
        source: "QR",
        qrUrl: qrResult.url,
        qrProvider: qrResult.provider,
        qrWarnings: qrResult.warnings
      }).finalDraft;
    }

    const extractionPricing = await this.aiUsageService.getModelPricing(OPENAI_IMAGE_EXTRACTION_MODEL);

    let extracted;
    try {
      extracted = await extractImageTransactionDraft({
        apiKey: this.openAiApiKey,
        catalog,
        primaryImage: preprocessing.primaryImage,
        secondaryImage: preprocessing.secondaryImage
      });

      await this.aiUsageService.log({
        provider: "OPENAI",
        feature: "RECEIPT_DRAFT",
        operation: "EXTRACTION",
        status: "SUCCESS",
        model: OPENAI_IMAGE_EXTRACTION_MODEL,
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
        feature: "RECEIPT_DRAFT",
        operation: "EXTRACTION",
        status: "ERROR",
        model: OPENAI_IMAGE_EXTRACTION_MODEL,
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

    return finalizeImageDraft({
      catalog,
      extracted: extracted.draft,
      localQualityIssues: preprocessing.localQualityIssues,
      source: qrResult.url ? "QR_WITH_IMAGE_FALLBACK" : "IMAGE_AI",
      qrUrl: qrResult.url,
      qrProvider: qrResult.provider,
      qrWarnings: qrResult.warnings
    }).finalDraft;
  }
}
