import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { finalizeImageDraft } from "./image-draft-finalizer";
import { parseTrustedReceiptQrUrlSyntax } from "./qr-receipt-resolver";
import type { VoiceCategoryCatalog } from "../voice/voice-category-matcher";
import type { ImageTransactionExtraction } from "./image-transaction-draft.schema";

const emptyCatalog: VoiceCategoryCatalog = {
  preferences: {
    showSharedCategories: true,
    defaultExpenseCategoryId: null,
    defaultIncomeCategoryId: null
  },
  byKind: {
    EXPENSE: { personal: [], shared: [] },
    INCOME: { personal: [], shared: [] }
  }
};

describe("receipt QR validation", () => {
  it("accepts trusted Soliq OFD check and epi URLs", () => {
    assert.equal(parseTrustedReceiptQrUrlSyntax("https://ofd.soliq.uz/check?t=1&r=2&c=3&s=4")?.provider, "SOLIQ_OFD");
    assert.equal(parseTrustedReceiptQrUrlSyntax("https://ofd.soliq.uz/epi?t=1&r=2&c=3&s=4")?.provider, "SOLIQ_OFD");
  });

  it("rejects untrusted or unsafe QR URLs", () => {
    assert.equal(parseTrustedReceiptQrUrlSyntax("http://ofd.soliq.uz/check?t=1"), null);
    assert.equal(parseTrustedReceiptQrUrlSyntax("https://localhost/check?t=1"), null);
    assert.equal(parseTrustedReceiptQrUrlSyntax("https://127.0.0.1/check?t=1"), null);
    assert.equal(parseTrustedReceiptQrUrlSyntax("https://example.com/check?t=1"), null);
    assert.equal(parseTrustedReceiptQrUrlSyntax("not a url"), null);
  });
});

describe("QR receipt finalization", () => {
  it("keeps QR amount and marks category missing when no catalog match exists", () => {
    const extracted: ImageTransactionExtraction = {
      kind: "EXPENSE",
      amount: 125000,
      currency: "UZS",
      categoryName: null,
      productNames: ["Milk", "Bread"],
      summary: "Fiscal receipt",
      receiptMode: "MULTI_ITEM",
      qualityRating: "GOOD",
      qualityIssues: [],
      documentType: "RECEIPT",
      extractedText: "TOTAL 125000",
      confidence: 0.98,
      missingFields: [],
      warnings: []
    };

    const result = finalizeImageDraft({
      catalog: emptyCatalog,
      extracted,
      source: "QR",
      qrUrl: "https://ofd.soliq.uz/check?t=1",
      qrProvider: "SOLIQ_OFD",
      qrWarnings: []
    }).finalDraft;

    assert.equal(result.extractionSource, "QR");
    assert.equal(result.receiptMode, "MULTI_ITEM");
    assert.equal(result.draft.amount, 125000);
    assert.equal(result.draft.currency, "UZS");
    assert.equal(result.qualityRating, "REVIEW");
    assert.ok(result.draft.missingFields.includes("category"));
  });
});
