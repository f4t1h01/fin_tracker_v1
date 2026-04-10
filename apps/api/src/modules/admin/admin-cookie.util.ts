import { adminSessionCookieName, adminSessionTtlSeconds } from "./admin-session.constants";

export function parseCookieHeader(header?: string | null) {
  const cookies: Record<string, string> = {};

  if (!header) {
    return cookies;
  }

  for (const part of header.split(";")) {
    const separatorIndex = part.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = part.slice(0, separatorIndex).trim();
    const value = part.slice(separatorIndex + 1).trim();
    cookies[key] = decodeURIComponent(value);
  }

  return cookies;
}

export function serializeAdminSessionCookie(value: string, secure: boolean) {
  const parts = [
    `${adminSessionCookieName}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${adminSessionTtlSeconds}`
  ];

  if (secure) {
    parts.push("Secure");
  }

  return parts.join("; ");
}

export function serializeAdminSessionClearCookie(secure: boolean) {
  const parts = [
    `${adminSessionCookieName}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT"
  ];

  if (secure) {
    parts.push("Secure");
  }

  return parts.join("; ");
}
