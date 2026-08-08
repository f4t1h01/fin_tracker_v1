import { NextResponse, type NextRequest } from "next/server";

import { nonceHeaderName } from "@/lib/csp";
import { webEnv } from "@/lib/env";

/**
 * Emits a per-request CSP nonce. The nonce is needed because the root layout
 * inlines a theme bootstrap script to avoid a flash of the wrong theme, and a
 * nonce is what lets that stay inline without opening the policy to
 * 'unsafe-inline' for all scripts.
 */

/** Third-party origins the sign-in widgets genuinely need. */
const googleIdentityOrigin = "https://accounts.google.com";
const googleApisOrigin = "https://www.googleapis.com";
const telegramScriptOrigin = "https://telegram.org";
const telegramFrameOrigin = "https://oauth.telegram.org";

function buildContentSecurityPolicy(nonce: string) {
  const apiOrigin = safeOrigin(webEnv.apiUrl);

  const connectSrc = ["'self'", googleIdentityOrigin, googleApisOrigin, apiOrigin].filter(Boolean).join(" ");

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    // Tailwind and next/font emit inline styles, which cannot carry a nonce here.
    "style-src 'self' 'unsafe-inline'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${googleIdentityOrigin} ${telegramScriptOrigin}`,
    // Telegram and Google serve avatars from a range of hosts.
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src ${connectSrc}`,
    `frame-src 'self' ${googleIdentityOrigin} ${telegramFrameOrigin}`,
    "media-src 'self' blob:",
    "form-action 'self'",
    "frame-ancestors 'self'",
    "upgrade-insecure-requests"
  ].join("; ");
}

function safeOrigin(value: string) {
  try {
    return new URL(value).origin;
  } catch {
    return "";
  }
}

export function middleware(request: NextRequest) {
  const nonce = crypto.randomUUID().replace(/-/g, "");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(nonceHeaderName, nonce);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders
    }
  });

  response.headers.set("Content-Security-Policy", buildContentSecurityPolicy(nonce));
  return response;
}

export const config = {
  // Skip static assets: they do not execute scripts and this keeps the middleware
  // off the hot path for images and chunks.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
