import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { normalizeVoiceFinancialExtraction } from "./voice-financial-normalizer";
import type { VoiceTransactionExtraction } from "./voice-transaction-draft.schema";

function draft(overrides: Partial<VoiceTransactionExtraction>): VoiceTransactionExtraction {
  return {
    kind: "EXPENSE",
    amount: 10,
    currency: null,
    categoryName: null,
    note: null,
    confidence: 0.8,
    missingFields: ["currency"],
    warnings: [],
    ...overrides
  };
}

describe("normalizeVoiceFinancialExtraction", () => {
  it("expands Uzbek thousand shorthand and defaults missing currency to UZS", () => {
    const normalized = normalizeVoiceFinancialExtraction({
      transcript: "Bugun ovqatga 50 ming so'm sarfladim",
      draft: draft({
        amount: 50,
        currency: null,
        missingFields: ["currency"]
      })
    });

    assert.equal(normalized.amount, 50_000);
    assert.equal(normalized.currency, "UZS");
    assert.deepEqual(normalized.missingFields, []);
    assert.ok(normalized.warnings.includes("Amount was expanded from spoken shorthand."));
  });

  it("expands million shorthand for larger local amounts", () => {
    const normalized = normalizeVoiceFinancialExtraction({
      transcript: "I received salary 2 million",
      draft: draft({
        kind: "INCOME",
        amount: 2,
        currency: null,
        missingFields: ["currency"]
      })
    });

    assert.equal(normalized.amount, 2_000_000);
    assert.equal(normalized.currency, "UZS");
  });

  it("infers explicit foreign currency when extraction missed it", () => {
    const normalized = normalizeVoiceFinancialExtraction({
      transcript: "I spent 20 dollars on lunch",
      draft: draft({
        amount: 20,
        currency: null,
        missingFields: ["currency"]
      })
    });

    assert.equal(normalized.amount, 20);
    assert.equal(normalized.currency, "USD");
    assert.deepEqual(normalized.missingFields, []);
  });

  it("keeps invalid non-positive amounts missing", () => {
    const normalized = normalizeVoiceFinancialExtraction({
      transcript: "zero som",
      draft: draft({
        amount: 0,
        currency: null,
        missingFields: []
      })
    });

    assert.equal(normalized.amount, null);
    assert.equal(normalized.currency, null);
    assert.deepEqual(normalized.missingFields, ["amount", "currency"]);
    assert.ok(normalized.warnings.includes("Amount must be greater than zero."));
  });

  it("sums multiple marked expense amounts when the model returns one line item", () => {
    const normalized = normalizeVoiceFinancialExtraction({
      transcript: "Taxi 20 ming va lunch 30 ming so'm",
      draft: draft({
        amount: 20,
        currency: null,
        missingFields: ["currency"]
      })
    });

    assert.equal(normalized.amount, 50_000);
    assert.equal(normalized.currency, "UZS");
    assert.ok(normalized.warnings.includes("Multiple expense amounts were combined into one draft."));
  });

  it("does not sum marked amounts when the transcript mixes received money", () => {
    const normalized = normalizeVoiceFinancialExtraction({
      transcript: "Salary received 2 million and groceries 50 ming",
      draft: draft({
        amount: 50,
        currency: null,
        missingFields: ["currency"]
      })
    });

    assert.equal(normalized.amount, 50_000);
    assert.equal(normalized.currency, "UZS");
    assert.ok(!normalized.warnings.includes("Multiple expense amounts were combined into one draft."));
  });
});
