import { SUPPORTED_CURRENCIES, type SupportedCurrency } from "../../common/currency";
import type { VoiceTransactionExtraction } from "./voice-transaction-draft.schema";

const MILLION_MARKER_PATTERN = /\b(?:million|mln|миллион[а-я]*|млн)\b/iu;
const MARKED_AMOUNT_PATTERN =
  /(\d+(?:[.,]\d+)?)\s*(ming|thousand|тыс\.?|тысяч[аи]?|тысяча|тысячи|минг|million|mln|миллион[а-я]*|млн)\b/giu;
const CUMULATIVE_EXPENSE_BLOCKLIST_PATTERN =
  /\b(?:salary|income|deposit|refund|cashback|change|received|got paid|oylik|maosh|qaytim|qaytardi|возврат|сдач[аи]|зарплат[а-я]*|получил[а-я]*)\b/iu;

const CURRENCY_ALIAS_PATTERNS: Array<{
  currency: SupportedCurrency;
  pattern: RegExp;
}> = [
  {
    currency: "UZS",
    pattern: /\b(?:uzs|so'?m|som|soum|сум|сом|сўм)\b/iu
  },
  {
    currency: "USD",
    pattern: /\b(?:usd|dollars?|доллар[а-я]*|бакс[а-я]*)\b/iu
  },
  {
    currency: "EUR",
    pattern: /\b(?:eur|euros?|евро)\b/iu
  },
  {
    currency: "RUB",
    pattern: /\b(?:rub|rubles?|рубл[а-я]*)\b/iu
  },
  {
    currency: "KZT",
    pattern: /\b(?:kzt|tenge|тенге)\b/iu
  },
  {
    currency: "TRY",
    pattern: /\b(?:try|lira|лир[а-я]*)\b/iu
  },
  {
    currency: "AED",
    pattern: /\b(?:aed|dirhams?|дирхам[а-я]*)\b/iu
  }
];

function mergeWarnings(warnings: string[], warning: string | null) {
  if (!warning) {
    return warnings;
  }

  return warnings.includes(warning) ? warnings : [...warnings, warning];
}

function normalizeMissingFields(fields: string[]) {
  return new Set(fields.map((field) => field.trim()).filter(Boolean));
}

function normalizeAmountPrecision(amount: number) {
  return Number(Number(amount).toFixed(2));
}

function markerScale(marker: string) {
  return MILLION_MARKER_PATTERN.test(marker) ? 1_000_000 : 1_000;
}

function extractMarkedAmountPhrases(transcript: string) {
  const amounts: Array<{ raw: number; scaled: number }> = [];

  for (const match of transcript.matchAll(MARKED_AMOUNT_PATTERN)) {
    const rawAmount = match[1]?.replace(",", ".") ?? "";
    const marker = match[2] ?? "";
    const amount = Number(rawAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      continue;
    }

    amounts.push({
      raw: normalizeAmountPrecision(amount),
      scaled: normalizeAmountPrecision(amount * markerScale(marker))
    });
  }

  return amounts;
}

function extractMarkedAmounts(transcript: string) {
  return extractMarkedAmountPhrases(transcript).map((amount) => amount.scaled);
}

function isApproximatelyEqual(left: number, right: number) {
  return Math.abs(left - right) <= 0.01;
}

function normalizeCumulativeExpenseAmount(params: {
  kind: VoiceTransactionExtraction["kind"];
  amount: number | null;
  transcript: string;
}): {
  amount: number | null;
  warning: string | null;
} {
  if (params.kind !== "EXPENSE" || CUMULATIVE_EXPENSE_BLOCKLIST_PATTERN.test(params.transcript)) {
    return {
      amount: params.amount,
      warning: null
    };
  }

  const markedAmounts = extractMarkedAmounts(params.transcript);
  if (markedAmounts.length < 2 || markedAmounts.length > 6) {
    return {
      amount: params.amount,
      warning: null
    };
  }

  const total = normalizeAmountPrecision(markedAmounts.reduce((sum, amount) => sum + amount, 0));
  if (params.amount !== null && isApproximatelyEqual(params.amount, total)) {
    return {
      amount: params.amount,
      warning: "Multiple expense amounts were combined into one draft."
    };
  }

  const modelUsedOneLineItem =
    params.amount === null ||
    markedAmounts.some((amount) => params.amount !== null && isApproximatelyEqual(amount, params.amount));
  if (!modelUsedOneLineItem) {
    return {
      amount: params.amount,
      warning: null
    };
  }

  return {
    amount: total,
    warning: "Multiple expense amounts were combined into one draft."
  };
}

function normalizeScaledAmount(params: {
  amount: number | null;
  transcript: string;
}): {
  amount: number | null;
  warning: string | null;
} {
  if (typeof params.amount !== "number" || !Number.isFinite(params.amount)) {
    return {
      amount: null,
      warning: null
    };
  }

  if (params.amount <= 0) {
    return {
      amount: null,
      warning: "Amount must be greater than zero."
    };
  }

  const amount = params.amount;
  const markedAmount = extractMarkedAmountPhrases(params.transcript).find((item) =>
    isApproximatelyEqual(amount, item.raw) ||
    isApproximatelyEqual(amount, item.scaled)
  );

  if (markedAmount) {
    return {
      amount: markedAmount.scaled,
      warning: isApproximatelyEqual(amount, markedAmount.scaled)
        ? null
        : "Amount was expanded from spoken shorthand."
    };
  }

  return {
    amount: normalizeAmountPrecision(amount),
    warning: null
  };
}

function inferCurrencyFromTranscript(transcript: string) {
  const matches = CURRENCY_ALIAS_PATTERNS
    .filter((item) => item.pattern.test(transcript))
    .map((item) => item.currency);
  const uniqueMatches = Array.from(new Set(matches));

  return uniqueMatches.length === 1 ? uniqueMatches[0] : null;
}

function normalizeCurrency(params: {
  currency: VoiceTransactionExtraction["currency"];
  amount: number | null;
  transcript: string;
}): {
  currency: VoiceTransactionExtraction["currency"];
  warning: string | null;
} {
  if (params.currency && SUPPORTED_CURRENCIES.includes(params.currency)) {
    return {
      currency: params.currency,
      warning: null
    };
  }

  if (typeof params.amount !== "number") {
    return {
      currency: null,
      warning: null
    };
  }

  const inferred = inferCurrencyFromTranscript(params.transcript);
  if (inferred) {
    return {
      currency: inferred,
      warning: `Currency was inferred as ${inferred} from the transcript.`
    };
  }

  return {
    currency: "UZS",
    warning: "Currency was not mentioned, so UZS was used."
  };
}

export function normalizeVoiceFinancialExtraction(params: {
  draft: VoiceTransactionExtraction;
  transcript: string;
}): VoiceTransactionExtraction {
  const missingFields = normalizeMissingFields(params.draft.missingFields);
  let warnings = [...params.draft.warnings];
  const amountResult = normalizeScaledAmount({
    amount: params.draft.amount,
    transcript: params.transcript
  });
  warnings = mergeWarnings(warnings, amountResult.warning);
  const cumulativeAmountResult = normalizeCumulativeExpenseAmount({
    kind: params.draft.kind,
    amount: amountResult.amount,
    transcript: params.transcript
  });
  warnings = mergeWarnings(warnings, cumulativeAmountResult.warning);

  const currencyResult = normalizeCurrency({
    currency: params.draft.currency,
    amount: cumulativeAmountResult.amount,
    transcript: params.transcript
  });
  warnings = mergeWarnings(warnings, currencyResult.warning);

  if (typeof cumulativeAmountResult.amount === "number") {
    missingFields.delete("amount");
  } else {
    missingFields.add("amount");
  }

  if (currencyResult.currency) {
    missingFields.delete("currency");
  } else {
    missingFields.add("currency");
  }

  return {
    ...params.draft,
    amount: cumulativeAmountResult.amount,
    currency: currencyResult.currency,
    missingFields: Array.from(missingFields),
    warnings
  };
}
