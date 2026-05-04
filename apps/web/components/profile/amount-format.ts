const groupSeparator = ",";

export function normalizeAmountInput(value: string) {
  let output = "";
  let hasDecimal = false;

  for (const char of value) {
    if (/\d/.test(char)) {
      output += char;
      continue;
    }

    if (char === "." && !hasDecimal) {
      output += ".";
      hasDecimal = true;
    }
  }

  return output;
}

export function formatAmountInputValue(value: string) {
  const normalized = normalizeAmountInput(value);
  if (!normalized) {
    return "";
  }

  const hasTrailingDecimal = normalized.endsWith(".");
  const [integerPartRaw, decimalPartRaw] = normalized.split(".");
  const integerPart = integerPartRaw.replace(/^0+(?=\d)/, "") || "0";
  const groupedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, groupSeparator);

  if (decimalPartRaw !== undefined) {
    return `${groupedInteger}.${decimalPartRaw}${hasTrailingDecimal ? "" : ""}`;
  }

  return groupedInteger;
}

export function parseTransactionAmount(value: string) {
  const normalized = normalizeAmountInput(value);
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : NaN;
}
