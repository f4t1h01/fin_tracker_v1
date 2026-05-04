import { matchVoiceCategory, type VoiceCategoryCatalog } from "../voice/voice-category-matcher";
import type {
  DocumentType,
  ImageExtractionSource,
  ImageQualityIssue,
  ImageTransactionDraftResponse,
  ImageTransactionExtraction,
  QualityRating,
  QrProvider,
  ReceiptMode
} from "./image-transaction-draft.schema";

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

export function dedupeProductNames(values: string[]) {
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

export function mergeUniqueStrings(...groups: Array<string[]>) {
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

export function mergeQualityIssues(...groups: Array<ImageQualityIssue[]>) {
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

export function resolveQualityRating(params: {
  extracted: ImageTransactionExtraction;
  mergedIssues: ImageQualityIssue[];
  source?: ImageExtractionSource;
  hasCategoryMatch?: boolean;
}) {
  if (params.source === "QR") {
    if (typeof params.extracted.amount === "number" && params.extracted.currency) {
      return params.hasCategoryMatch ? ("GOOD" as QualityRating) : ("REVIEW" as QualityRating);
    }

    return "POOR" as QualityRating;
  }

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

export function finalizeImageDraft(params: {
  catalog: VoiceCategoryCatalog;
  extracted: ImageTransactionExtraction;
  localQualityIssues?: ImageQualityIssue[];
  source: ImageExtractionSource;
  qrUrl?: string | null;
  qrProvider?: QrProvider | null;
  qrWarnings?: string[];
}) {
  const matching = matchVoiceCategory({
    catalog: params.catalog,
    kind: params.extracted.kind,
    categoryName: params.extracted.categoryName
  });
  const mergedQualityIssues = mergeQualityIssues(params.extracted.qualityIssues, params.localQualityIssues ?? []);
  const missingFields = new Set<string>(params.extracted.missingFields);

  if (!params.extracted.kind) {
    missingFields.add("kind");
  }
  if (typeof params.extracted.amount !== "number") {
    missingFields.add("amount");
    if (!mergedQualityIssues.includes("INCOMPLETE_TOTAL")) {
      mergedQualityIssues.push("INCOMPLETE_TOTAL");
    }
  }
  if (!params.extracted.currency) {
    missingFields.add("currency");
  }
  if (!matching.categoryId) {
    missingFields.add("category");
  } else {
    missingFields.delete("category");
  }

  const warnings = mergeUniqueStrings(
    params.extracted.warnings,
    buildQualityWarnings(mergedQualityIssues),
    params.qrWarnings ?? []
  );

  if (!matching.categoryId) {
    warnings.push(
      matching.categoryNameCandidate
        ? `No exact category match for "${matching.categoryNameCandidate}"`
        : "No category was identified from the receipt"
    );
  }

  const productNames = dedupeProductNames(params.extracted.productNames);
  const note = buildReceiptNote({
    productNames,
    summary: params.extracted.summary,
    receiptMode: params.extracted.receiptMode
  });
  const qualityRating = resolveQualityRating({
    extracted: params.extracted,
    mergedIssues: mergedQualityIssues,
    source: params.source,
    hasCategoryMatch: Boolean(matching.categoryId)
  });

  const finalDraft: ImageTransactionDraftResponse = {
    extractedText: params.extracted.extractedText,
    draft: {
      kind: params.extracted.kind,
      amount: params.extracted.amount,
      currency: params.extracted.currency,
      categoryId: matching.categoryId,
      categoryNameCandidate: matching.categoryId ? null : matching.categoryNameCandidate,
      note,
      confidence: params.extracted.confidence,
      missingFields: Array.from(missingFields),
      warnings
    },
    receiptMode: params.extracted.receiptMode,
    productNames,
    qualityRating,
    qualityIssues: mergedQualityIssues,
    documentType: params.extracted.documentType as DocumentType,
    extractionSource: params.source,
    qrUrl: params.qrUrl ?? null,
    qrProvider: params.qrProvider ?? null,
    qrWarnings: params.qrWarnings ?? []
  };

  return {
    finalDraft,
    matching,
    finalization: {
      mergedQualityIssues,
      missingFields: Array.from(missingFields),
      warnings,
      note,
      productNames,
      qualityRating
    }
  };
}
