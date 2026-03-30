import { SUPPORTED_CURRENCIES } from "../../common/currency";

export const voiceTransactionKinds = ["EXPENSE", "INCOME"] as const;

export type VoiceTransactionKind = (typeof voiceTransactionKinds)[number];
export type VoiceTransactionCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export type VoiceTransactionExtraction = {
  kind: VoiceTransactionKind | null;
  amount: number | null;
  currency: VoiceTransactionCurrency | null;
  categoryName: string | null;
  note: string | null;
  confidence: number;
  missingFields: string[];
  warnings: string[];
};

export type VoiceTransactionDraft = {
  kind: VoiceTransactionKind | null;
  amount: number | null;
  currency: VoiceTransactionCurrency | null;
  categoryId: string | null;
  categoryNameCandidate: string | null;
  note: string | null;
  confidence: number;
  missingFields: string[];
  warnings: string[];
};

export type VoiceTransactionDraftResponse = {
  transcript: string;
  draft: VoiceTransactionDraft;
};

export const voiceTransactionExtractionJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    kind: {
      anyOf: [
        {
          type: "string",
          enum: [...voiceTransactionKinds]
        },
        {
          type: "null"
        }
      ]
    },
    amount: {
      anyOf: [
        {
          type: "number"
        },
        {
          type: "null"
        }
      ]
    },
    currency: {
      anyOf: [
        {
          type: "string",
          enum: [...SUPPORTED_CURRENCIES]
        },
        {
          type: "null"
        }
      ]
    },
    categoryName: {
      anyOf: [
        {
          type: "string",
          maxLength: 120
        },
        {
          type: "null"
        }
      ]
    },
    note: {
      anyOf: [
        {
          type: "string",
          maxLength: 160
        },
        {
          type: "null"
        }
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
  required: ["kind", "amount", "currency", "categoryName", "note", "confidence", "missingFields", "warnings"]
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
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
    return [];
  }

  return value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean);
}

export function parseVoiceTransactionExtraction(value: unknown): VoiceTransactionExtraction {
  if (!isRecord(value)) {
    throw new Error("Voice extraction payload is malformed");
  }

  const confidence = normalizeMaybeNumber(value.confidence);
  return {
    kind: normalizeMaybeEnum(value.kind, voiceTransactionKinds),
    amount: normalizeMaybeNumber(value.amount),
    currency: normalizeMaybeEnum(value.currency, SUPPORTED_CURRENCIES),
    categoryName: normalizeText(value.categoryName),
    note: normalizeText(value.note),
    confidence: confidence === null ? 0 : Math.min(1, Math.max(0, confidence)),
    missingFields: normalizeStringArray(value.missingFields),
    warnings: normalizeStringArray(value.warnings)
  };
}
