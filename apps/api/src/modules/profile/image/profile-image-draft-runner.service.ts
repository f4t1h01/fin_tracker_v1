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
import { finalizeImageDraft } from "./image-draft-finalizer";
import { resolveQrReceiptDraft } from "./qr-receipt-resolver";
import {
  type ImageQualityIssue,
  type ImageTransactionDraftResponse,
  type ImageTransactionExtraction,
  type QualityRating
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
    qrDetected: boolean;
    qrText: string | null;
    qrUrl: string | null;
    qrProvider: string | null;
    qrQualityIssues: string[];
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
    const qrResult = await resolveQrReceiptDraft(preprocessing.qrUrl);
    if (qrResult.ok) {
      const finalized = finalizeImageDraft({
        catalog,
        extracted: qrResult.extracted,
        source: "QR",
        qrUrl: qrResult.url,
        qrProvider: qrResult.provider,
        qrWarnings: qrResult.warnings
      });

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
          },
          qrDetected: preprocessing.qrDetected,
          qrText: preprocessing.qrText,
          qrUrl: preprocessing.qrUrl,
          qrProvider: preprocessing.qrProvider,
          qrQualityIssues: preprocessing.qrQualityIssues
        },
        model: {
          model: "QR_RECEIPT",
          endpoint: "/v1/responses",
          promptSummary: "Trusted fiscal QR receipt extraction without OpenAI vision.",
          categoryContext,
          categoryCatalog: createCatalogSummary(catalog)
        },
        extraction: {
          providerRequestId: null,
          rawDraft: qrResult.extracted
        },
        matching: finalized.matching,
        finalization: finalized.finalization,
        finalDraft: finalized.finalDraft
      };
    }

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

    const finalized = finalizeImageDraft({
      catalog,
      extracted: extracted.draft,
      localQualityIssues: preprocessing.localQualityIssues,
      source: qrResult.url ? "QR_WITH_IMAGE_FALLBACK" : "IMAGE_AI",
      qrUrl: qrResult.url,
      qrProvider: qrResult.provider,
      qrWarnings: qrResult.warnings
    });

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
        },
        qrDetected: preprocessing.qrDetected,
        qrText: preprocessing.qrText,
        qrUrl: preprocessing.qrUrl,
        qrProvider: preprocessing.qrProvider,
        qrQualityIssues: preprocessing.qrQualityIssues
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
      matching: finalized.matching,
      finalization: {
        ...finalized.finalization
      },
      finalDraft: finalized.finalDraft
    };
  }
}
