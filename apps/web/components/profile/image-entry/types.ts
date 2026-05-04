import type { AiTransactionDraftLike } from "../ai-draft-types";

export type ImageDraftStage = "idle" | "capturing" | "uploading" | "preprocessing" | "analyzing" | "ready" | "error";
export type ReceiptMode = "SINGLE_ITEM" | "MULTI_ITEM" | "UNKNOWN";
export type QualityRating = "GOOD" | "REVIEW" | "POOR";
export type ImageQualityIssue = "BLUR" | "GLARE" | "LOW_CONTRAST" | "CROPPED" | "NON_DOCUMENT" | "INCOMPLETE_TOTAL" | "MULTIPLE_RECORDS";
export type DocumentType = "RECEIPT" | "INVOICE" | "BILL" | "SCREENSHOT" | "UNKNOWN";
export type ImageExtractionSource = "QR" | "IMAGE_AI" | "QR_WITH_IMAGE_FALLBACK";
export type QrProvider = "SOLIQ_OFD" | "UNKNOWN";
export type QrCodeStatus = "FETCHED" | "FOUND_NO_DATA";

export type ImageQrCodeResult = {
  value: string;
  url: string | null;
  provider: QrProvider | null;
  status: QrCodeStatus;
  warning: string | null;
  usedForDraft: boolean;
};

export type ImageTransactionDraftResponse = AiTransactionDraftLike & {
  extractedText: string | null;
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
