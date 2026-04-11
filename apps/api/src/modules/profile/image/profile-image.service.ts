import { BadRequestException, Injectable, ServiceUnavailableException } from "@nestjs/common";
import type { MultipartFile } from "@fastify/multipart";
import { randomUUID } from "node:crypto";

import { AiUsageService } from "../../ai/ai-usage.service";
import { PrismaService } from "../../prisma/prisma.service";
import { ProfileService } from "../profile.service";
import { OpenAiRequestError } from "../voice/openai-request-error";
import { matchVoiceCategory, type VoiceCategoryCatalog } from "../voice/voice-category-matcher";
import { extractImageTransactionDraft } from "./openai-image-extraction.client";
import { preprocessReceiptImage } from "./receipt-preprocess.client";
import {
  type DocumentType,
  type ImageQualityIssue,
  type ImageTransactionDraftResponse,
  type ImageTransactionExtraction,
  type QualityRating,
  type ReceiptMode
} from "./image-transaction-draft.schema";
import { OPENAI_IMAGE_EXTRACTION_MODEL } from "./image.constants";

function truncateText(value: string, maxLength: number) {
  return value.length <= maxLength ? value : `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function normalizeProductLabel(value: string) {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^[\-\*\u2022]+/, "")
    .trim();
}

function dedupeProductNames(values: string[]) {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const value of values) {
    const normalized = normalizeProductLabel(value);
    if (!normalized) {
      continue;
    }

    const lookup = normalized.toLowerCase();
    if (seen.has(lookup)) {
      continue;
    }

    seen.add(lookup);
    output.push(normalized);
  }

  return output;
}

function buildReceiptNote(params: {
  productNames: string[];
  summary: string | null;
  receiptMode: ReceiptMode;
}) {
  const productNames = dedupeProductNames(params.productNames).slice(0, 6);
  if (productNames.length === 1) {
    return truncateText(productNames[0], 160);
  }

  if (productNames.length > 1) {
    const joined = productNames.join(", ");
    if (joined.length <= 160) {
      return joined;
    }
  }

  if (params.summary?.trim()) {
    return truncateText(params.summary.trim(), 160);
  }

  if (productNames.length > 0) {
    return truncateText(productNames.slice(0, 3).join(", "), 160);
  }

  return null;
}

function mergeUniqueStrings(...groups: Array<string[]>) {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const group of groups) {
    for (const item of group) {
      const normalized = item.trim();
      if (!normalized) {
        continue;
      }

      const lookup = normalized.toLowerCase();
      if (seen.has(lookup)) {
        continue;
      }

      seen.add(lookup);
      output.push(normalized);
    }
  }

  return output;
}

function mergeQualityIssues(...groups: Array<ImageQualityIssue[]>) {
  const seen = new Set<ImageQualityIssue>();
  const output: ImageQualityIssue[] = [];

  for (const group of groups) {
    for (const item of group) {
      if (seen.has(item)) {
        continue;
      }

      seen.add(item);
      output.push(item);
    }
  }

  return output;
}

function buildQualityWarnings(issues: ImageQualityIssue[]) {
  const warnings: string[] = [];

  if (issues.includes("BLUR")) {
    warnings.push("The image still looks blurry after cleanup, so some receipt details may be missing.");
  }
  if (issues.includes("GLARE")) {
    warnings.push("Glare or bright reflections may hide parts of the receipt.");
  }
  if (issues.includes("LOW_CONTRAST")) {
    warnings.push("The receipt has low contrast, so faint text may be hard to read.");
  }
  if (issues.includes("CROPPED")) {
    warnings.push("The receipt looks cropped, so the final total or some items may be missing.");
  }
  if (issues.includes("INCOMPLETE_TOTAL")) {
    warnings.push("The final total could not be identified. Enter the amount manually before saving.");
  }

  return warnings;
}

function resolveQualityRating(params: {
  extracted: ImageTransactionExtraction;
  mergedIssues: ImageQualityIssue[];
}) {
  if (params.extracted.qualityRating === "POOR") {
    return "POOR" as QualityRating;
  }

  if (params.mergedIssues.includes("NON_DOCUMENT") || params.mergedIssues.includes("MULTIPLE_RECORDS")) {
    return "POOR" as QualityRating;
  }

  if (params.extracted.amount === null && params.mergedIssues.length > 0) {
    return "POOR" as QualityRating;
  }

  if (params.extracted.qualityRating === "REVIEW" || params.mergedIssues.length > 0) {
    return "REVIEW" as QualityRating;
  }

  return "GOOD" as QualityRating;
}

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

    const matchedCategory = matchVoiceCategory({
      catalog,
      kind: extracted.draft.kind,
      categoryName: extracted.draft.categoryName
    });

    const mergedQualityIssues = mergeQualityIssues(extracted.draft.qualityIssues, preprocessing.localQualityIssues);
    const missingFields = new Set<string>(extracted.draft.missingFields);

    if (!extracted.draft.kind) {
      missingFields.add("kind");
    }
    if (typeof extracted.draft.amount !== "number") {
      missingFields.add("amount");
      if (!mergedQualityIssues.includes("INCOMPLETE_TOTAL")) {
        mergedQualityIssues.push("INCOMPLETE_TOTAL");
      }
    }
    if (!extracted.draft.currency) {
      missingFields.add("currency");
    }
    if (!matchedCategory.categoryId) {
      missingFields.add("category");
    } else {
      missingFields.delete("category");
    }

    const warnings = mergeUniqueStrings(
      extracted.draft.warnings,
      buildQualityWarnings(mergedQualityIssues)
    );

    if (!matchedCategory.categoryId) {
      warnings.push(matchedCategory.categoryNameCandidate ? `No exact category match for "${matchedCategory.categoryNameCandidate}"` : "No category was identified from the receipt");
    }

    const productNames = dedupeProductNames(extracted.draft.productNames);
    const note = buildReceiptNote({
      productNames,
      summary: extracted.draft.summary,
      receiptMode: extracted.draft.receiptMode
    });

    return {
      extractedText: extracted.draft.extractedText,
      draft: {
        kind: extracted.draft.kind,
        amount: extracted.draft.amount,
        currency: extracted.draft.currency,
        categoryId: matchedCategory.categoryId,
        categoryNameCandidate: matchedCategory.categoryId ? null : matchedCategory.categoryNameCandidate,
        note,
        confidence: extracted.draft.confidence,
        missingFields: Array.from(missingFields),
        warnings
      },
      receiptMode: extracted.draft.receiptMode,
      productNames,
      qualityRating: resolveQualityRating({
        extracted: extracted.draft,
        mergedIssues: mergedQualityIssues
      }),
      qualityIssues: mergedQualityIssues,
      documentType: extracted.draft.documentType as DocumentType
    };
  }
}
