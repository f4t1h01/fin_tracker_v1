import { BadRequestException, Injectable } from "@nestjs/common";
import type { MultipartFile } from "@fastify/multipart";

import { convertToUzs, getLatestCurrencyRates } from "../common/currency";
import { PrismaService } from "../prisma/prisma.service";
import { ProfileImageDraftRunnerService } from "../profile/image/profile-image-draft-runner.service";
import type { ImageTransactionDraftResponse } from "../profile/image/image-transaction-draft.schema";

type AdminAiDemoStepStatus = "DONE" | "REVIEW" | "BLOCKED";

type AdminAiDemoStep = {
  key: string;
  title: string;
  explanation: string;
  status: AdminAiDemoStepStatus;
  output: unknown;
};

type AdminAiDemoWritePreview = {
  ready: boolean;
  blockedReason: string | null;
  model: "Transaction";
  sourceEndpoint: "/profile/me/transactions";
  targetUserId: string;
  targetCoupleId: string | null;
  resolvedCategory: {
    source: "MATCHED" | "DEFAULT" | "UNRESOLVED";
    matchedCategoryId: string | null;
    defaultCategoryId: string | null;
    resolvedCategoryId: string | null;
    name: string | null;
    kind: "EXPENSE" | "INCOME" | null;
  };
  record: {
    userId: string;
    coupleId: string;
    categoryId: string;
    kind: "EXPENSE" | "INCOME";
    amount: number;
    currency: string;
    exchangeRate: number;
    amountInUzs: number;
    note: string | null;
    happenedAt: string;
  } | null;
};

type AdminAiDemoImageDraftResponse = {
  steps: AdminAiDemoStep[];
  finalDraft: ImageTransactionDraftResponse;
  writePreview: AdminAiDemoWritePreview;
};

@Injectable()
export class AdminAiDemoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly runner: ProfileImageDraftRunnerService
  ) {}

  private async buildWritePreview(
    targetUserId: string,
    finalDraft: ImageTransactionDraftResponse
  ): Promise<AdminAiDemoWritePreview> {
    const [user, activeBind, membership] = await Promise.all([
      this.prisma.client.user.findUnique({
        where: { id: targetUserId },
        select: {
          defaultIncomeCategoryId: true,
          defaultExpenseCategoryId: true
        }
      }),
      this.prisma.client.coupleBind.findUnique({
        where: { userId: targetUserId },
        select: { coupleId: true }
      }),
      this.prisma.client.membership.findFirst({
        where: { userId: targetUserId },
        orderBy: { createdAt: "asc" },
        select: { coupleId: true }
      })
    ]);

    if (!user) {
      throw new BadRequestException("Target user was not found");
    }

    const kind = finalDraft.draft.kind;
    const amount = finalDraft.draft.amount;
    const currency = finalDraft.draft.currency;
    const coupleId = activeBind?.coupleId ?? membership?.coupleId ?? null;
    const defaultCategoryId =
      kind === "INCOME"
        ? user.defaultIncomeCategoryId
        : kind === "EXPENSE"
          ? user.defaultExpenseCategoryId
          : null;
    const resolvedCategoryId = finalDraft.draft.categoryId ?? defaultCategoryId ?? null;
    const resolvedCategorySource = finalDraft.draft.categoryId
      ? "MATCHED"
      : defaultCategoryId
        ? "DEFAULT"
        : "UNRESOLVED";

    if (!coupleId) {
      return {
        ready: false,
        blockedReason: "No active workspace was found for the selected user.",
        model: "Transaction",
        sourceEndpoint: "/profile/me/transactions",
        targetUserId,
        targetCoupleId: null,
        resolvedCategory: {
          source: resolvedCategorySource,
          matchedCategoryId: finalDraft.draft.categoryId,
          defaultCategoryId,
          resolvedCategoryId,
          name: null,
          kind: kind ?? null
        },
        record: null
      };
    }

    if (!kind) {
      return {
        ready: false,
        blockedReason: "The draft is missing the transaction kind.",
        model: "Transaction",
        sourceEndpoint: "/profile/me/transactions",
        targetUserId,
        targetCoupleId: coupleId,
        resolvedCategory: {
          source: resolvedCategorySource,
          matchedCategoryId: finalDraft.draft.categoryId,
          defaultCategoryId,
          resolvedCategoryId,
          name: null,
          kind: null
        },
        record: null
      };
    }

    if (typeof amount !== "number") {
      return {
        ready: false,
        blockedReason: "The draft is missing the transaction amount.",
        model: "Transaction",
        sourceEndpoint: "/profile/me/transactions",
        targetUserId,
        targetCoupleId: coupleId,
        resolvedCategory: {
          source: resolvedCategorySource,
          matchedCategoryId: finalDraft.draft.categoryId,
          defaultCategoryId,
          resolvedCategoryId,
          name: null,
          kind
        },
        record: null
      };
    }

    if (!currency) {
      return {
        ready: false,
        blockedReason: "The draft is missing the transaction currency.",
        model: "Transaction",
        sourceEndpoint: "/profile/me/transactions",
        targetUserId,
        targetCoupleId: coupleId,
        resolvedCategory: {
          source: resolvedCategorySource,
          matchedCategoryId: finalDraft.draft.categoryId,
          defaultCategoryId,
          resolvedCategoryId,
          name: null,
          kind
        },
        record: null
      };
    }

    if (!resolvedCategoryId) {
      return {
        ready: false,
        blockedReason: "No category could be resolved for the selected user context.",
        model: "Transaction",
        sourceEndpoint: "/profile/me/transactions",
        targetUserId,
        targetCoupleId: coupleId,
        resolvedCategory: {
          source: resolvedCategorySource,
          matchedCategoryId: finalDraft.draft.categoryId,
          defaultCategoryId,
          resolvedCategoryId: null,
          name: null,
          kind
        },
        record: null
      };
    }

    const category = await this.prisma.client.category.findFirst({
      where: {
        id: resolvedCategoryId,
        coupleId,
        kind
      },
      select: {
        id: true,
        name: true,
        kind: true
      }
    });

    if (!category) {
      return {
        ready: false,
        blockedReason: "The resolved category is not valid for the selected user workspace.",
        model: "Transaction",
        sourceEndpoint: "/profile/me/transactions",
        targetUserId,
        targetCoupleId: coupleId,
        resolvedCategory: {
          source: resolvedCategorySource,
          matchedCategoryId: finalDraft.draft.categoryId,
          defaultCategoryId,
          resolvedCategoryId,
          name: null,
          kind
        },
        record: null
      };
    }

    const rates = await getLatestCurrencyRates();
    const exchangeRate = rates[currency];
    const amountInUzs = convertToUzs(amount, exchangeRate);

    return {
      ready: true,
      blockedReason: null,
      model: "Transaction",
      sourceEndpoint: "/profile/me/transactions",
      targetUserId,
      targetCoupleId: coupleId,
      resolvedCategory: {
        source: resolvedCategorySource,
        matchedCategoryId: finalDraft.draft.categoryId,
        defaultCategoryId,
        resolvedCategoryId: category.id,
        name: category.name,
        kind: category.kind
      },
      record: {
        userId: targetUserId,
        coupleId,
        categoryId: category.id,
        kind,
        amount,
        currency,
        exchangeRate,
        amountInUzs,
        note: finalDraft.draft.note,
        happenedAt: new Date().toISOString()
      }
    };
  }

  async createImageDraftDemo(
    targetUserId: string,
    file: MultipartFile
  ): Promise<AdminAiDemoImageDraftResponse> {
    const targetUser = await this.prisma.client.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        username: true
      }
    });

    if (!targetUser) {
      throw new BadRequestException("Target user was not found");
    }

    const execution = await this.runner.execute({
      userId: targetUserId,
      file,
      persistAiUsage: false
    });
    const writePreview = await this.buildWritePreview(targetUserId, execution.finalDraft);

    const steps: AdminAiDemoStep[] = [
      {
        key: "input-context",
        title: "Selected demo context",
        explanation:
          "The uploaded image is attached to a real app user context so category matching and final write targets reflect the actual workspace configuration.",
        status: "DONE",
        output: {
          file: execution.input,
          targetUser,
          activeWorkspace: execution.targetContext.activeCouple,
          hasPartnerConnection: execution.targetContext.hasPartnerConnection
        }
      },
      {
        key: "preprocess",
        title: "Image decoded and cleaned",
        explanation:
          "The demo runs the same deterministic preprocessing pipeline as the production image flow: decode, auto-orient, resize, safe crop attempt, and text cleanup.",
        status:
          execution.preprocessing.localQualityIssues.length > 0
            ? "REVIEW"
            : "DONE",
        output: {
          previewStages: execution.preprocessing.previewStages,
          preprocessingApplied: execution.preprocessing.preprocessingApplied,
          localQualityIssues: execution.preprocessing.localQualityIssues,
          primaryImageMimeType: execution.preprocessing.primaryImageMimeType,
          secondaryImageMimeType: execution.preprocessing.secondaryImageMimeType,
          includesSecondaryImage: execution.preprocessing.includesSecondaryImage,
          modelInputStages: execution.preprocessing.modelInputStages,
          qrDetected: execution.preprocessing.qrDetected,
          qrText: execution.preprocessing.qrText,
          qrUrl: execution.preprocessing.qrUrl,
          qrProvider: execution.preprocessing.qrProvider,
          qrQualityIssues: execution.preprocessing.qrQualityIssues
        }
      },
      {
        key: "extraction",
        title: execution.finalDraft.extractionSource === "QR" ? "QR extraction executed" : "Model extraction executed",
        explanation:
          execution.finalDraft.extractionSource === "QR"
            ? "A trusted fiscal QR link was decoded and parsed before the image model was needed."
            : "The cleaned image is sent through the existing strict JSON extraction pipeline. The explanation is fixed, but the extracted output is live from the current model response.",
        status: execution.extraction.rawDraft.amount === null ? "REVIEW" : "DONE",
        output: {
          model: execution.model.model,
          endpoint: execution.model.endpoint,
          promptSummary: execution.model.promptSummary,
          categoryCatalog: execution.model.categoryCatalog,
          providerRequestId: execution.extraction.providerRequestId,
          rawDraft: execution.extraction.rawDraft
        }
      },
      {
        key: "matching",
        title: "Category matched against visible catalog",
        explanation:
          "The extracted category candidate is compared against the visible categories for the selected user context. No new category is created in demo mode.",
        status: execution.matching.categoryId ? "DONE" : "REVIEW",
        output: execution.matching
      },
      {
        key: "final-draft",
        title: "Final UI draft assembled",
        explanation:
          "Warnings, missing fields, note generation, and merged quality checks are resolved with fixed server logic before the final draft is prepared for the transaction form.",
        status:
          execution.finalDraft.draft.missingFields.length > 0 ||
          execution.finalDraft.draft.warnings.length > 0
            ? "REVIEW"
            : "DONE",
        output: {
          finalization: execution.finalization,
          finalDraft: execution.finalDraft
        }
      },
      {
        key: "write-preview",
        title: "Database write preview",
        explanation:
          "This step shows the exact Transaction record that would be written by the normal save flow. Demo mode stops here and does not persist anything.",
        status: writePreview.ready ? "DONE" : "BLOCKED",
        output: writePreview
      }
    ];

    return {
      steps,
      finalDraft: execution.finalDraft,
      writePreview
    };
  }
}
