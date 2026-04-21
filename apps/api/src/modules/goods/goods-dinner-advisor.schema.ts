export type GoodsRecipePreview = {
  label: string;
  url: string;
  sourceType: "youtube_search" | "image_search";
  sourceLabel: string;
};

export type GoodsDinnerRecipeSuggestion = {
  title: string;
  whyItFits: string;
  usesItems: string[];
  assumedStaples: string[];
  missingItems: string[];
  steps: string[];
  confidence: number;
  wasteReductionNotes: string[];
  recipePreview: GoodsRecipePreview | null;
};

export type GoodsDinnerAdvisorExtraction = {
  assistantMessage: string;
  pantryMeals: [Omit<GoodsDinnerRecipeSuggestion, "recipePreview">, Omit<GoodsDinnerRecipeSuggestion, "recipePreview">];
  minimalBuyMeal: Omit<GoodsDinnerRecipeSuggestion, "recipePreview">;
  warnings: string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeText(value: unknown, fallback = "") {
  if (typeof value !== "string") {
    return fallback;
  }

  return value.trim();
}

function normalizeStringArray(value: unknown, maxItems: number, maxLength: number) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, maxItems)
    .map((item) => (item.length <= maxLength ? item : `${item.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`));
}

function normalizeConfidence(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }

  return Math.min(1, Math.max(0, value));
}

function parseSuggestion(value: unknown) {
  if (!isRecord(value)) {
    throw new Error("Dinner advisor suggestion is malformed");
  }

  return {
    title: normalizeText(value.title).slice(0, 80),
    whyItFits: normalizeText(value.whyItFits).slice(0, 220),
    usesItems: normalizeStringArray(value.usesItems, 8, 60),
    assumedStaples: normalizeStringArray(value.assumedStaples, 6, 40),
    missingItems: normalizeStringArray(value.missingItems, 5, 50),
    steps: normalizeStringArray(value.steps, 5, 180),
    confidence: normalizeConfidence(value.confidence),
    wasteReductionNotes: normalizeStringArray(value.wasteReductionNotes, 3, 100)
  };
}

export const goodsDinnerAdvisorJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    assistantMessage: {
      type: "string",
      maxLength: 240
    },
    pantryMeals: {
      type: "array",
      minItems: 2,
      maxItems: 2,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string", maxLength: 80 },
          whyItFits: { type: "string", maxLength: 220 },
          usesItems: {
            type: "array",
            maxItems: 8,
            items: { type: "string", maxLength: 60 }
          },
          assumedStaples: {
            type: "array",
            maxItems: 6,
            items: { type: "string", maxLength: 40 }
          },
          missingItems: {
            type: "array",
            maxItems: 5,
            items: { type: "string", maxLength: 50 }
          },
          steps: {
            type: "array",
            maxItems: 5,
            items: { type: "string", maxLength: 180 }
          },
          confidence: {
            type: "number",
            minimum: 0,
            maximum: 1
          },
          wasteReductionNotes: {
            type: "array",
            maxItems: 3,
            items: { type: "string", maxLength: 100 }
          }
        },
        required: ["title", "whyItFits", "usesItems", "assumedStaples", "missingItems", "steps", "confidence", "wasteReductionNotes"]
      }
    },
    minimalBuyMeal: {
      type: "object",
      additionalProperties: false,
      properties: {
        title: { type: "string", maxLength: 80 },
        whyItFits: { type: "string", maxLength: 220 },
        usesItems: {
          type: "array",
          maxItems: 8,
          items: { type: "string", maxLength: 60 }
        },
        assumedStaples: {
          type: "array",
          maxItems: 6,
          items: { type: "string", maxLength: 40 }
        },
        missingItems: {
          type: "array",
          maxItems: 5,
          items: { type: "string", maxLength: 50 }
        },
        steps: {
          type: "array",
          maxItems: 5,
          items: { type: "string", maxLength: 180 }
        },
        confidence: {
          type: "number",
          minimum: 0,
          maximum: 1
        },
        wasteReductionNotes: {
          type: "array",
          maxItems: 3,
          items: { type: "string", maxLength: 100 }
        }
      },
      required: ["title", "whyItFits", "usesItems", "assumedStaples", "missingItems", "steps", "confidence", "wasteReductionNotes"]
    },
    warnings: {
      type: "array",
      maxItems: 4,
      items: {
        type: "string",
        maxLength: 140
      }
    }
  },
  required: ["assistantMessage", "pantryMeals", "minimalBuyMeal", "warnings"]
} as const;

export function parseGoodsDinnerAdvisorExtraction(value: unknown): GoodsDinnerAdvisorExtraction {
  if (!isRecord(value)) {
    throw new Error("Dinner advisor payload is malformed");
  }

  const pantryMeals = Array.isArray(value.pantryMeals) ? value.pantryMeals.map((item) => parseSuggestion(item)).slice(0, 2) : [];
  if (pantryMeals.length !== 2) {
    throw new Error("Dinner advisor must return exactly two pantry meals");
  }

  const minimalBuyMeal = parseSuggestion(value.minimalBuyMeal);

  return {
    assistantMessage: normalizeText(value.assistantMessage).slice(0, 240),
    pantryMeals: [pantryMeals[0], pantryMeals[1]],
    minimalBuyMeal,
    warnings: normalizeStringArray(value.warnings, 4, 140)
  };
}
