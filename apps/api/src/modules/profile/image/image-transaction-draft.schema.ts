import { SUPPORTED_CURRENCIES } from "../../common/currency";

export const imageTransactionKinds = ["EXPENSE", "INCOME"] as const;
export const receiptModes = ["SINGLE_ITEM", "MULTI_ITEM", "UNKNOWN"] as const;
export const qualityRatings = ["GOOD", "REVIEW", "POOR"] as const;
export const qualityIssues = ["BLUR", "GLARE", "LOW_CONTRAST", "CROPPED", "NON_DOCUMENT", "INCOMPLETE_TOTAL", "MULTIPLE_RECORDS"] as const;
export const documentTypes = ["RECEIPT", "INVOICE", "BILL", "SCREENSHOT", "UNKNOWN"] as const;
export const extractionSources = ["QR", "IMAGE_AI", "QR_WITH_IMAGE_FALLBACK"] as const;
export const qrProviders = ["SOLIQ_OFD", "UNKNOWN"] as const;
export const qrCodeStatuses = ["FETCHED", "FOUND_NO_DATA"] as const;

export type ImageTransactionKind = (typeof imageTransactionKinds)[number];
export type ImageTransactionCurrency = (typeof SUPPORTED_CURRENCIES)[number];
export type ReceiptMode = (typeof receiptModes)[number];
export type QualityRating = (typeof qualityRatings)[number];
export type ImageQualityIssue = (typeof qualityIssues)[number];
export type DocumentType = (typeof documentTypes)[number];
export type ImageExtractionSource = (typeof extractionSources)[number];
export type QrProvider = (typeof qrProviders)[number];
export type QrCodeStatus = (typeof qrCodeStatuses)[number];

export type ImageTransactionExtraction = {
  kind: ImageTransactionKind | null;
  amount: number | null;
  currency: ImageTransactionCurrency | null;
  categoryName: string | null;
  productNames: string[];
  summary: string | null;
  receiptMode: ReceiptMode;
  qualityRating: QualityRating;
  qualityIssues: ImageQualityIssue[];
  documentType: DocumentType;
  extractedText: string | null;
  confidence: number;
  missingFields: string[];
  warnings: string[];
};

export type ImageTransactionDraft = {
  kind: ImageTransactionKind | null;
  amount: number | null;
  currency: ImageTransactionCurrency | null;
  categoryId: string | null;
  categoryNameCandidate: string | null;
  note: string | null;
  confidence: number;
  missingFields: string[];
  warnings: string[];
};

export type ImageQrCodeResult = {
  value: string;
  url: string | null;
  provider: QrProvider | null;
  status: QrCodeStatus;
  warning: string | null;
  usedForDraft: boolean;
};

export type ImageTransactionDraftResponse = {
  extractedText: string | null;
  draft: ImageTransactionDraft;
  receiptMode: ReceiptMode;
  productNames: string[];
  qualityRating: QualityRating;
  qualityIssues: ImageQualityIssue[];
  documentType: DocumentType;
  extractionSource: ImageExtractionSource;
  qrUrl: string | null;
  qrProvider: QrProvider | null;
  qrWarnings: string[];
  qrSummary: string | null;
  qrCodes: ImageQrCodeResult[];
};

export const imageTransactionExtractionJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    kind: {
      anyOf: [
        { type: "string", enum: [...imageTransactionKinds] },
        { type: "null" }
      ]
    },
    amount: {
      anyOf: [
        { type: "number" },
        { type: "null" }
      ]
    },
    currency: {
      anyOf: [
        { type: "string", enum: [...SUPPORTED_CURRENCIES] },
        { type: "null" }
      ]
    },
    categoryName: {
      anyOf: [
        { type: "string", maxLength: 120 },
        { type: "null" }
      ]
    },
    productNames: {
      type: "array",
      items: {
        type: "string",
        maxLength: 120
      }
    },
    summary: {
      anyOf: [
        { type: "string", maxLength: 200 },
        { type: "null" }
      ]
    },
    receiptMode: {
      type: "string",
      enum: [...receiptModes]
    },
    qualityRating: {
      type: "string",
      enum: [...qualityRatings]
    },
    qualityIssues: {
      type: "array",
      items: {
        type: "string",
        enum: [...qualityIssues]
      }
    },
    documentType: {
      type: "string",
      enum: [...documentTypes]
    },
    extractedText: {
      anyOf: [
        { type: "string", maxLength: 2000 },
        { type: "null" }
      ]
    },
    confidence: {
      type: "number",
      minimum: 0,
      maximum: 1
    },
    missingFields: {
      type: "array",
      items: {
        type: "string"
      }
    },
    warnings: {
      type: "array",
      items: {
        type: "string"
      }
    }
  },
  required: [
    "kind",
    "amount",
    "currency",
    "categoryName",
    "productNames",
    "summary",
    "receiptMode",
    "qualityRating",
    "qualityIssues",
    "documentType",
    "extractedText",
    "confidence",
    "missingFields",
    "warnings"
  ]
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeText(value: unknown, maxLength?: number) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed.length) {
    return null;
  }

  return typeof maxLength === "number" && trimmed.length > maxLength ? trimmed.slice(0, maxLength) : trimmed;
}

function normalizeMaybeEnum<T extends string>(value: unknown, choices: readonly T[]): T | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toUpperCase();
  return choices.includes(normalized as T) ? (normalized as T) : null;
}

function normalizeMaybeNumber(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return value;
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as string[];
  }

  return value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean);
}

function normalizeEnumArray<T extends string>(value: unknown, choices: readonly T[]) {
  if (!Array.isArray(value)) {
    return [] as T[];
  }

  const normalized = new Set<T>();
  for (const item of value) {
    const next = normalizeMaybeEnum(item, choices);
    if (next) {
      normalized.add(next);
    }
  }

  return Array.from(normalized);
}

export function parseImageTransactionExtraction(value: unknown): ImageTransactionExtraction {
  if (!isRecord(value)) {
    throw new Error("Image extraction payload is malformed");
  }

  const confidence = normalizeMaybeNumber(value.confidence);

  return {
    kind: normalizeMaybeEnum(value.kind, imageTransactionKinds),
    amount: normalizeMaybeNumber(value.amount),
    currency: normalizeMaybeEnum(value.currency, SUPPORTED_CURRENCIES),
    categoryName: normalizeText(value.categoryName, 120),
    productNames: normalizeStringArray(value.productNames).map((item) => item.slice(0, 120)),
    summary: normalizeText(value.summary, 200),
    receiptMode: normalizeMaybeEnum(value.receiptMode, receiptModes) ?? "UNKNOWN",
    qualityRating: normalizeMaybeEnum(value.qualityRating, qualityRatings) ?? "REVIEW",
    qualityIssues: normalizeEnumArray(value.qualityIssues, qualityIssues),
    documentType: normalizeMaybeEnum(value.documentType, documentTypes) ?? "UNKNOWN",
    extractedText: normalizeText(value.extractedText, 2000),
    confidence: confidence === null ? 0 : Math.min(1, Math.max(0, confidence)),
    missingFields: normalizeStringArray(value.missingFields),
    warnings: normalizeStringArray(value.warnings)
  };
}
