import { BadRequestException, Injectable, ServiceUnavailableException } from "@nestjs/common";
import type { MultipartFile } from "@fastify/multipart";
import { randomUUID } from "node:crypto";

import { AiUsageService } from "../../ai/ai-usage.service";
import { PrismaService } from "../../prisma/prisma.service";
import { OpenAiRequestError } from "../voice/openai-request-error";
import {
  buildVoiceCategoryContext,
  matchVoiceCategory,
  type VoiceCategoryCatalog
} from "../voice/voice-category-matcher";
import { extractImageTransactionDraft } from "./openai-image-extraction.client";
import { OPENAI_IMAGE_EXTRACTION_MODEL } from "./image.constants";
import {
  type ImageQualityIssue,
  type ImageTransactionDraftResponse,
  type ImageTransactionExtraction,
  type QualityRating,
  type ReceiptMode
} from "./image-transaction-draft.schema";
import {
  preprocessReceiptImage,
  type ReceiptPreprocessPreviewStage
} from "./receipt-preprocess.client";

type TargetContext = {
  user: {
    id: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    username: string | null;
    showSharedCategories: boolean;
    defaultIncomeCategoryId: string | null;
    defaultExpenseCategoryId: string | null;
  };
  activeCouple: {
    id: string;
    name: string;
  } | null;
  hasPartnerConnection: boolean;
};

type CatalogSummary = {
  expensePersonal: string[];
  expenseShared: string[];
  incomePersonal: string[];
  incomeShared: string[];
};

type ImageDraftExecutionParams = {
  userId: string;
  file: MultipartFile;
  persistAiUsage?: boolean;
};

type ImageDraftExecutionResult = {
  correlationId: string;
  targetContext: TargetContext;
  input: {
    filename: string;
    mimeType: string;
    fieldName: string;
  };
  preprocessing: {
    preprocessingApplied: string[];
    localQualityIssues: ImageQualityIssue[];
    primaryImageMimeType: string;
    secondaryImageMimeType: string | null;
    includesSecondaryImage: boolean;
    previewStages: ReceiptPreprocessPreviewStage[];
    modelInputStages: {
      primary: ReceiptPreprocessPreviewStage["key"] | null;
      secondary: ReceiptPreprocessPreviewStage["key"] | null;
    };
  };
  model: {
    model: string;
    endpoint: "/v1/responses";
    promptSummary: string;
    categoryContext: string;
    categoryCatalog: CatalogSummary;
  };
  extraction: {
    providerRequestId: string | null;
    rawDraft: ImageTransactionExtraction;
  };
  matching: ReturnType<typeof matchVoiceCategory>;
  finalization: {
    mergedQualityIssues: ImageQualityIssue[];
    missingFields: string[];
    warnings: string[];
    note: string | null;
    productNames: string[];
    qualityRating: QualityRating;
  };
  finalDraft: ImageTransactionDraftResponse;
};

type CategoryRecord = {
  id: string;
  name: string;
  kind: "EXPENSE" | "INCOME";
  scope: "PERSONAL" | "SHARED";
  ownerUserId: string | null;
  isVisible: boolean;
  parentCategoryId: string | null;
};

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

function createEmptyCatalog(preferences: {
  showSharedCategories: boolean;
  defaultIncomeCategoryId: string | null;
  defaultExpenseCategoryId: string | null;
}): VoiceCategoryCatalog {
  return {
    preferences,
    byKind: {
      EXPENSE: { personal: [], shared: [] },
      INCOME: { personal: [], shared: [] }
    }
  };
}

function createCatalogSummary(catalog: VoiceCategoryCatalog): CatalogSummary {
  const flattenLabels = (
    nodes: Array<{ name: string; children: Array<{ name: string }> }>
  ): string[] => {
    const labels: string[] = [];

    for (const node of nodes) {
      labels.push(node.name);
      for (const child of node.children) {
        labels.push(`${node.name} / ${child.name}`);
      }
    }

    return labels;
  };

  return {
    expensePersonal: flattenLabels(catalog.byKind.EXPENSE.personal),
    expenseShared: flattenLabels(catalog.byKind.EXPENSE.shared),
    incomePersonal: flattenLabels(catalog.byKind.INCOME.personal),
    incomeShared: flattenLabels(catalog.byKind.INCOME.shared)
  };
}

@Injectable()
export class ProfileImageDraftRunnerService {
  private readonly openAiApiKey = process.env.OPENAI_API_KEY?.trim() ?? null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiUsageService: AiUsageService
  ) {}

  private async resolveTargetContext(userId: string): Promise<TargetContext> {
    const [user, activeBind, membership] = await Promise.all([
      this.prisma.client.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          username: true,
          showSharedCategories: true,
          defaultIncomeCategoryId: true,
          defaultExpenseCategoryId: true
        }
      }),
      this.prisma.client.coupleBind.findUnique({
        where: { userId },
        select: { coupleId: true }
      }),
      this.prisma.client.membership.findFirst({
        where: { userId },
        orderBy: { createdAt: "asc" },
        select: { coupleId: true }
      })
    ]);

    if (!user) {
      throw new BadRequestException("Target user was not found");
    }

    const activeCoupleId = activeBind?.coupleId ?? membership?.coupleId ?? null;
    const activeCouple = activeCoupleId
      ? await this.prisma.client.couple.findUnique({
          where: { id: activeCoupleId },
          select: { id: true, name: true }
        })
      : null;

    return {
      user,
      activeCouple,
      hasPartnerConnection: Boolean(activeBind?.coupleId)
    };
  }

  private async readCategoryCatalog(context: TargetContext): Promise<VoiceCategoryCatalog> {
    const preferences = {
      showSharedCategories: context.user.showSharedCategories,
      defaultIncomeCategoryId: context.user.defaultIncomeCategoryId,
      defaultExpenseCategoryId: context.user.defaultExpenseCategoryId
    };

    if (!context.activeCouple) {
      return createEmptyCatalog(preferences);
    }

    const categories = await this.prisma.client.category.findMany({
      where: {
        coupleId: context.activeCouple.id,
        OR: [
          { scope: "SHARED" },
          {
            scope: "PERSONAL",
            ownerUserId: context.user.id
          }
        ]
      },
      orderBy: [{ kind: "asc" }, { parentCategoryId: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        kind: true,
        scope: true,
        ownerUserId: true,
        isVisible: true,
        parentCategoryId: true
      }
    });

    const buildTree = (kind: "EXPENSE" | "INCOME", scope: "PERSONAL" | "SHARED") => {
      const matching = categories.filter(
        (category): category is CategoryRecord => category.kind === kind && category.scope === scope
      );
      const parents = matching.filter((category) => !category.parentCategoryId);
      const childrenByParent = new Map<string, CategoryRecord[]>();

      for (const category of matching) {
        if (!category.parentCategoryId) {
          continue;
        }

        const existing = childrenByParent.get(category.parentCategoryId) ?? [];
        existing.push(category);
        childrenByParent.set(category.parentCategoryId, existing);
      }

      return parents.map((parent) => ({
        id: parent.id,
        name: parent.name,
        scope: parent.scope,
        kind: parent.kind,
        ownerUserId: parent.ownerUserId,
        isVisible: parent.isVisible,
        children: (childrenByParent.get(parent.id) ?? []).map((child) => ({
          id: child.id,
          name: child.name,
          scope: child.scope,
          kind: child.kind,
          ownerUserId: child.ownerUserId,
          isVisible: child.isVisible
        }))
      }));
    };

    return {
      preferences,
      byKind: {
        EXPENSE: {
          personal: buildTree("EXPENSE", "PERSONAL"),
          shared: buildTree("EXPENSE", "SHARED")
        },
        INCOME: {
          personal: buildTree("INCOME", "PERSONAL"),
          shared: buildTree("INCOME", "SHARED")
        }
      }
    };
  }

  async execute(params: ImageDraftExecutionParams): Promise<ImageDraftExecutionResult> {
    if (!this.openAiApiKey) {
      throw new ServiceUnavailableException("Image drafting is not configured on this server");
    }

    if (!params.file) {
      throw new BadRequestException("Upload a receipt image first");
    }

    const persistAiUsage = params.persistAiUsage ?? true;
    const correlationId = randomUUID();
    const [targetContext, activeBind] = await Promise.all([
      this.resolveTargetContext(params.userId),
      this.prisma.client.coupleBind.findUnique({
        where: { userId: params.userId },
        select: { coupleId: true }
      })
    ]);
    const coupleIdForUsage = activeBind?.coupleId ?? null;
    const catalog = await this.readCategoryCatalog(targetContext);
    const categoryContext = buildVoiceCategoryContext(catalog);
    const preprocessing = await preprocessReceiptImage(params.file);
    const primaryPreviewStage =
      preprocessing.previewStages.find((stage) => stage.usedForExtraction === "PRIMARY")?.key ?? null;
    const secondaryPreviewStage =
      preprocessing.previewStages.find((stage) => stage.usedForExtraction === "SECONDARY")?.key ?? null;
    const extractionPricing = persistAiUsage
      ? await this.aiUsageService.getModelPricing(OPENAI_IMAGE_EXTRACTION_MODEL)
      : null;

    let extracted;
    try {
      extracted = await extractImageTransactionDraft({
        apiKey: this.openAiApiKey,
        catalog,
        primaryImage: preprocessing.primaryImage,
        secondaryImage: preprocessing.secondaryImage
      });

      if (persistAiUsage) {
        await this.aiUsageService.log({
          provider: "OPENAI",
          feature: "RECEIPT_DRAFT",
          operation: "EXTRACTION",
          status: "SUCCESS",
          model: OPENAI_IMAGE_EXTRACTION_MODEL,
          endpoint: "/v1/responses",
          correlationId,
          providerRequestId: extracted.providerRequestId,
          userId: params.userId,
          coupleId: coupleIdForUsage,
          usage: extracted.usage,
          pricing: extractionPricing
        });
      }
    } catch (error) {
      if (persistAiUsage) {
        await this.aiUsageService.log({
          provider: "OPENAI",
          feature: "RECEIPT_DRAFT",
          operation: "EXTRACTION",
          status: "ERROR",
          model: OPENAI_IMAGE_EXTRACTION_MODEL,
          endpoint: "/v1/responses",
          correlationId,
          providerRequestId: error instanceof OpenAiRequestError ? error.details?.providerRequestId ?? null : null,
          userId: params.userId,
          coupleId: coupleIdForUsage,
          usage: error instanceof OpenAiRequestError ? error.details?.usage ?? null : null,
          pricing: extractionPricing,
          errorMessage: error instanceof Error ? error.message : "Unknown extraction error"
        });
      }

      throw error;
    }

    const matching = matchVoiceCategory({
      catalog,
      kind: extracted.draft.kind,
      categoryName: extracted.draft.categoryName
    });

    const mergedQualityIssues = mergeQualityIssues(
      extracted.draft.qualityIssues,
      preprocessing.localQualityIssues
    );
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
    if (!matching.categoryId) {
      missingFields.add("category");
    } else {
      missingFields.delete("category");
    }

    const warnings = mergeUniqueStrings(
      extracted.draft.warnings,
      buildQualityWarnings(mergedQualityIssues)
    );

    if (!matching.categoryId) {
      warnings.push(
        matching.categoryNameCandidate
          ? `No exact category match for "${matching.categoryNameCandidate}"`
          : "No category was identified from the receipt"
      );
    }

    const productNames = dedupeProductNames(extracted.draft.productNames);
    const note = buildReceiptNote({
      productNames,
      summary: extracted.draft.summary,
      receiptMode: extracted.draft.receiptMode
    });
    const qualityRating = resolveQualityRating({
      extracted: extracted.draft,
      mergedIssues: mergedQualityIssues
    });

    const finalDraft: ImageTransactionDraftResponse = {
      extractedText: extracted.draft.extractedText,
      draft: {
        kind: extracted.draft.kind,
        amount: extracted.draft.amount,
        currency: extracted.draft.currency,
        categoryId: matching.categoryId,
        categoryNameCandidate: matching.categoryId ? null : matching.categoryNameCandidate,
        note,
        confidence: extracted.draft.confidence,
        missingFields: Array.from(missingFields),
        warnings
      },
      receiptMode: extracted.draft.receiptMode,
      productNames,
      qualityRating,
      qualityIssues: mergedQualityIssues,
      documentType: extracted.draft.documentType
    };

    return {
      correlationId,
      targetContext,
      input: {
        filename: params.file.filename,
        mimeType: params.file.mimetype,
        fieldName: params.file.fieldname
      },
      preprocessing: {
        preprocessingApplied: preprocessing.preprocessingApplied,
        localQualityIssues: preprocessing.localQualityIssues,
        primaryImageMimeType: preprocessing.primaryImage.mimeType,
        secondaryImageMimeType: preprocessing.secondaryImage?.mimeType ?? null,
        includesSecondaryImage: Boolean(preprocessing.secondaryImage),
        previewStages: preprocessing.previewStages,
        modelInputStages: {
          primary: primaryPreviewStage,
          secondary: secondaryPreviewStage
        }
      },
      model: {
        model: OPENAI_IMAGE_EXTRACTION_MODEL,
        endpoint: "/v1/responses",
        promptSummary:
          "Strict JSON receipt extraction with visible category context and no invented fields.",
        categoryContext,
        categoryCatalog: createCatalogSummary(catalog)
      },
      extraction: {
        providerRequestId: extracted.providerRequestId,
        rawDraft: extracted.draft
      },
      matching,
      finalization: {
        mergedQualityIssues,
        missingFields: Array.from(missingFields),
        warnings,
        note,
        productNames,
        qualityRating
      },
      finalDraft
    };
  }
}
