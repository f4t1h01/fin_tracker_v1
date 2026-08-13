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
  const isDevelopment = process.env.NODE_ENV !== "production";

  const connectSrc = ["'self'", googleIdentityOrigin, googleApisOrigin, apiOrigin].filter(Boolean).join(" ");

  // The dev bundler compiles modules through eval() for source maps and HMR, so a
  // policy without 'unsafe-eval' breaks `next dev` entirely. Production bundles
  // never eval, so this stays out of the shipped policy.
  const devScriptSrc = isDevelopment ? " 'unsafe-eval'" : "";
  // HMR talks over a websocket that is not covered by the connect-src list above.
  const devConnectSrc = isDevelopment ? " ws: http://localhost:3000" : "";

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    // Tailwind and next/font emit inline styles, which cannot carry a nonce here.
    // Google Identity Services injects its own stylesheet link for the rendered
    // button, so its origin has to be allowed or the button renders unstyled.
    `style-src 'self' 'unsafe-inline' ${googleIdentityOrigin}`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${googleIdentityOrigin} ${telegramScriptOrigin}${devScriptSrc}`,
    // Telegram and Google serve avatars from a range of hosts.
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src ${connectSrc}${devConnectSrc}`,
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
  const policy = buildContentSecurityPolicy(nonce);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(nonceHeaderName, nonce);
  // Next.js reads the nonce for its own bundle <script> tags out of the *request*
  // Content-Security-Policy header (app-render.js), not from a custom header. The
  // policy below uses 'strict-dynamic', which makes browsers ignore 'self' and the
  // host allowlist, so without this line every /_next/static chunk is blocked and
  // the app ships with no client JS at all.
  requestHeaders.set("Content-Security-Policy", policy);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders
    }
  });

  response.headers.set("Content-Security-Policy", policy);
  return response;
}

export const config = {
  // Skip static assets: they do not execute scripts and this keeps the middleware
  // off the hot path for images and chunks.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
