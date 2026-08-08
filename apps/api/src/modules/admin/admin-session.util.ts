import { getApiEnv } from "@repo/config";
import { verify } from "jsonwebtoken";

import { parseCookieHeader } from "./admin-cookie.util";
import { adminSessionCookieName } from "./admin-session.constants";

export type AdminSessionClaims = {
  email: string;
  tokenVersion: number;
};

export function readAdminSessionCookie(request: { headers?: Record<string, unknown> }): string | null {
  const cookieHeader = request.headers?.cookie;
  const cookies = parseCookieHeader(typeof cookieHeader === "string" ? cookieHeader : undefined);
  return cookies[adminSessionCookieName] ?? null;
}

/**
 * Verifies the signature and shape of an admin session token.
 * Returns null instead of throwing so non-auth callers (e.g. the rate limiter,
 * which only wants an identity hint) can degrade gracefully.
 */
export function verifyAdminSessionToken(token: string | null | undefined): AdminSessionClaims | null {
  if (!token) {
    return null;
  }

  try {
    const payload = verify(token, getApiEnv().API_JWT_SECRET) as {
      sub?: unknown;
      type?: unknown;
      tokenVersion?: unknown;
    };

    if (payload.type !== "admin" || typeof payload.sub !== "string" || !payload.sub) {
      return null;
    }

    return {
      email: payload.sub,
      tokenVersion: typeof payload.tokenVersion === "number" ? payload.tokenVersion : 0
    };
  } catch {
    return null;
  }
}
