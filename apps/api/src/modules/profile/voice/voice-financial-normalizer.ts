import { SUPPORTED_CURRENCIES, type SupportedCurrency } from "../../common/currency";
import type { VoiceTransactionExtraction } from "./voice-transaction-draft.schema";

const THOUSAND_MARKER_PATTERN = /\b(?:ming|thousand|тыс\.?|тысяч[аи]?|тысяча|тысячи|минг)\b/iu;
const MILLION_MARKER_PATTERN = /\b(?:million|mln|миллион[а-я]*|млн)\b/iu;

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

  const transcript = params.transcript.toLowerCase();
  let amount = params.amount;
  let scale: number | null = null;

  if (amount < 10_000 && MILLION_MARKER_PATTERN.test(transcript)) {
    scale = 1_000_000;
  } else if (amount < 1_000 && THOUSAND_MARKER_PATTERN.test(transcript)) {
    scale = 1_000;
  }

  if (scale) {
    amount *= scale;
  }

  return {
    amount: normalizeAmountPrecision(amount),
    warning: scale ? "Amount was expanded from spoken shorthand." : null
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

  const currencyResult = normalizeCurrency({
    currency: params.draft.currency,
    amount: amountResult.amount,
    transcript: params.transcript
  });
  warnings = mergeWarnings(warnings, currencyResult.warning);

  if (typeof amountResult.amount === "number") {
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
    amount: amountResult.amount,
    currency: currencyResult.currency,
    missingFields: Array.from(missingFields),
    warnings
  };
}
