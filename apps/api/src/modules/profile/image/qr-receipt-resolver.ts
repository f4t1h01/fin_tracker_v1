import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

import type { SupportedCurrency } from "../../common/currency";
import type { ImageTransactionExtraction, QrProvider } from "./image-transaction-draft.schema";

const TRUSTED_QR_HOST = "ofd.soliq.uz";
const TRUSTED_QR_PATHS = new Set(["/check", "/epi"]);
const QR_FETCH_TIMEOUT_MS = 5000;
const QR_FETCH_MAX_BYTES = 512 * 1024;
const QR_FETCH_MAX_REDIRECTS = 2;

export type TrustedQrUrl = {
  url: string;
  provider: QrProvider;
};

export type QrReceiptResolveResult =
  | {
      ok: true;
      url: string;
      provider: QrProvider;
      extracted: ImageTransactionExtraction;
      warnings: string[];
    }
  | {
      ok: false;
      url: string | null;
      provider: QrProvider | null;
      warnings: string[];
    };

type ParsedReceipt = {
  amount: number | null;
  currency: SupportedCurrency;
  productNames: string[];
  summary: string | null;
  extractedText: string | null;
  isRefund: boolean;
};

function isPrivateIpv4(value: string) {
  const parts = value.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return true;
  }

  const [a, b] = parts;
  return (
    a === 10 ||
    a === 127 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 169 && b === 254) ||
    a === 0
  );
}

function isPrivateIpv6(value: string) {
  const normalized = value.toLowerCase();
  return normalized === "::1" || normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe80:");
}

async function assertPublicHostname(hostname: string) {
  if (hostname === "localhost") {
    throw new Error("QR link points to localhost");
  }

  const literalType = isIP(hostname);
  if (literalType === 4 && isPrivateIpv4(hostname)) {
    throw new Error("QR link points to a private IP address");
  }
  if (literalType === 6 && isPrivateIpv6(hostname)) {
    throw new Error("QR link points to a private IP address");
  }
  if (literalType !== 0) {
    return;
  }

  const addresses = await lookup(hostname, { all: true });
  if (!addresses.length) {
    throw new Error("QR link host could not be resolved");
  }

  for (const address of addresses) {
    if ((address.family === 4 && isPrivateIpv4(address.address)) || (address.family === 6 && isPrivateIpv6(address.address))) {
      throw new Error("QR link host resolves to a private IP address");
    }
  }
}

export function parseTrustedReceiptQrUrlSyntax(value: string | null | undefined): TrustedQrUrl | null {
  const raw = value?.trim();
  if (!raw) {
    return null;
  }

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return null;
  }

  if (parsed.protocol !== "https:") {
    return null;
  }

  const hostname = parsed.hostname.toLowerCase();
  if (hostname !== TRUSTED_QR_HOST || !TRUSTED_QR_PATHS.has(parsed.pathname)) {
    return null;
  }

  return {
    url: parsed.toString(),
    provider: "SOLIQ_OFD"
  };
}

export async function normalizeTrustedReceiptQrUrl(value: string | null | undefined): Promise<TrustedQrUrl | null> {
  const parsed = parseTrustedReceiptQrUrlSyntax(value);
  if (!parsed) {
    return null;
  }

  await assertPublicHostname(new URL(parsed.url).hostname.toLowerCase());
  return parsed;
}

async function readLimitedResponseText(response: Response) {
  if (!response.body) {
    return response.text();
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    total += value.byteLength;
    if (total > QR_FETCH_MAX_BYTES) {
      throw new Error("QR receipt response is too large");
    }
    chunks.push(value);
  }

  return Buffer.concat(chunks).toString("utf8");
}

async function fetchTrustedQrText(url: string, redirectCount = 0): Promise<{ url: string; text: string }> {
  if (redirectCount > QR_FETCH_MAX_REDIRECTS) {
    throw new Error("QR receipt link redirected too many times");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), QR_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "manual",
      signal: controller.signal,
      headers: {
        Accept: "application/json,text/html;q=0.9,text/plain;q=0.8"
      }
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) {
        throw new Error("QR receipt link redirected without a location");
      }

      const nextUrl = new URL(location, url).toString();
      const trusted = await normalizeTrustedReceiptQrUrl(nextUrl);
      if (!trusted) {
        throw new Error("QR receipt link redirected to an untrusted host");
      }

      return fetchTrustedQrText(trusted.url, redirectCount + 1);
    }

    if (!response.ok) {
      throw new Error(`QR receipt request failed with status ${response.status}`);
    }

    return {
      url,
      text: await readLimitedResponseText(response)
    };
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeAmount(value: unknown, keyHint = "") {
  if (typeof value !== "number" && typeof value !== "string") {
    return null;
  }

  const numberValue = typeof value === "number" ? value : Number(value.replace(/\s+/g, "").replace(",", "."));
  if (!Number.isFinite(numberValue) || numberValue <= 0) {
    return null;
  }

  const lowerKey = keyHint.toLowerCase();
  const looksMinorUnits = /tiyin|minor|kope?k|cent/.test(lowerKey) || (/amount|sum|total/.test(lowerKey) && Number.isInteger(numberValue) && numberValue >= 1000000);
  return Number((looksMinorUnits ? numberValue / 100 : numberValue).toFixed(2));
}

function walkJson(value: unknown, visit: (key: string, value: unknown) => void, key = "") {
  visit(key, value);
  if (Array.isArray(value)) {
    value.forEach((item, index) => walkJson(item, visit, `${key}[${index}]`));
    return;
  }

  if (typeof value === "object" && value !== null) {
    for (const [childKey, childValue] of Object.entries(value)) {
      walkJson(childValue, visit, childKey);
    }
  }
}

function parseJsonReceipt(value: unknown): ParsedReceipt | null {
  const productNames = new Set<string>();
  const amountCandidates: number[] = [];
  let summary: string | null = null;
  let isRefund = false;

  walkJson(value, (key, item) => {
    const lowerKey = key.toLowerCase();
    if (/refund|return|cancel/.test(lowerKey) && (item === true || item === 1 || item === "1")) {
      isRefund = true;
    }

    if (/(total|amount|sum|paid|payable|to'?lov|итог|жами|сумма)/i.test(key)) {
      const amount = normalizeAmount(item, key);
      if (amount) {
        amountCandidates.push(amount);
      }
    }

    if (/(name|title|product|item|ikpuname|service)/i.test(key)) {
      const text = normalizeString(item);
      if (text && text.length <= 160 && !/^https?:\/\//i.test(text)) {
        productNames.add(text);
      }
    }

    if (!summary && /(merchant|store|seller|organization|company)/i.test(key)) {
      summary = normalizeString(item);
    }
  });

  const amount = amountCandidates.length ? Math.max(...amountCandidates) : null;
  if (!amount && productNames.size === 0) {
    return null;
  }

  return {
    amount,
    currency: "UZS",
    productNames: Array.from(productNames).slice(0, 12),
    summary,
    extractedText: JSON.stringify(value).slice(0, 2000),
    isRefund
  };
}

function stripHtml(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function parseHtmlReceipt(value: string): ParsedReceipt | null {
  const jsonMatches = value.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) ?? [];
  for (const script of jsonMatches) {
    const body = script.replace(/^<script[^>]*>/i, "").replace(/<\/script>$/i, "");
    try {
      const parsed = parseJsonReceipt(JSON.parse(body));
      if (parsed) {
        return parsed;
      }
    } catch {
      // Keep trying the visible text fallback.
    }
  }

  const text = stripHtml(value);
  const amountMatches = Array.from(text.matchAll(/(?:total|grand total|amount due|paid|итог|жами|сумма)[^\d]{0,40}([0-9][0-9\s.,]{2,})/gi))
    .map((match) => normalizeAmount(match[1]))
    .filter((amount): amount is number => typeof amount === "number");
  const amount = amountMatches.length ? Math.max(...amountMatches) : null;

  if (!amount) {
    return null;
  }

  return {
    amount,
    currency: "UZS",
    productNames: [],
    summary: "Fiscal receipt",
    extractedText: text.slice(0, 2000),
    isRefund: /\b(refund|return|возврат|қайтар)/i.test(text)
  };
}

function parseReceiptPayload(text: string): ParsedReceipt | null {
  try {
    return parseJsonReceipt(JSON.parse(text));
  } catch {
    return parseHtmlReceipt(text);
  }
}

function toExtraction(receipt: ParsedReceipt): ImageTransactionExtraction {
  const receiptMode = receipt.productNames.length === 1 ? "SINGLE_ITEM" : receipt.productNames.length > 1 ? "MULTI_ITEM" : "UNKNOWN";

  return {
    kind: receipt.isRefund ? "INCOME" : "EXPENSE",
    amount: receipt.amount,
    currency: receipt.currency,
    categoryName: null,
    productNames: receipt.productNames,
    summary: receipt.summary,
    receiptMode,
    qualityRating: receipt.amount ? "GOOD" : "REVIEW",
    qualityIssues: receipt.amount ? [] : ["INCOMPLETE_TOTAL"],
    documentType: "RECEIPT",
    extractedText: receipt.extractedText,
    confidence: receipt.amount ? 0.98 : 0.7,
    missingFields: receipt.amount ? [] : ["amount"],
    warnings: []
  };
}

export async function resolveQrReceiptDraft(qrUrl: string | null | undefined): Promise<QrReceiptResolveResult> {
  const warnings: string[] = [];
  const trusted = await normalizeTrustedReceiptQrUrl(qrUrl);
  if (!trusted) {
    return {
      ok: false,
      url: qrUrl ?? null,
      provider: null,
      warnings: qrUrl ? ["QR code link is not from a trusted fiscal receipt domain."] : []
    };
  }

  try {
    const response = await fetchTrustedQrText(trusted.url);
    const parsed = parseReceiptPayload(response.text);
    if (!parsed || !parsed.amount) {
      return {
        ok: false,
        url: response.url,
        provider: trusted.provider,
        warnings: ["QR receipt link was reachable, but structured receipt totals could not be parsed."]
      };
    }

    return {
      ok: true,
      url: response.url,
      provider: trusted.provider,
      extracted: toExtraction(parsed),
      warnings
    };
  } catch (error) {
    return {
      ok: false,
      url: trusted.url,
      provider: trusted.provider,
      warnings: [error instanceof Error ? error.message : "QR receipt link could not be resolved."]
    };
  }
}
