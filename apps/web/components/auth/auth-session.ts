"use client";

import { webEnv } from "@/lib/env";

import { parseApiResponse } from "@/components/profile/api";
import {
  clearDashboardCache,
  clearDashboardDisplayCurrencyCache,
  clearProfileSnapshotCache
} from "@/components/profile/cache";
import { clearPendingTelegramContext, detectTelegramContextFromWindow, readPendingTelegramContext } from "@/components/profile/telegram-context";
import { authSourceKey, tokenKey } from "@/components/profile/types";

export type AuthSource = "website" | "email-code" | "google" | "telegram";

export type AuthPayload = {
  accessToken: string;
};

export type AuthProvidersResponse = {
  google: {
    isEnabled: boolean;
    clientId: string | null;
  };
  email: {
    emailCodeEnabled: boolean;
  };
};

export function clearBrowserAuthSession() {
  localStorage.removeItem(tokenKey);
  localStorage.removeItem(authSourceKey);
  clearProfileSnapshotCache();
  clearDashboardCache();
  clearDashboardDisplayCurrencyCache();
}

export async function fetchAuthProviders() {
  const response = await fetch(`${webEnv.apiUrl}/auth/providers`);
  return parseApiResponse<AuthProvidersResponse>(response);
}

export async function validateAuthToken(token: string) {
  const response = await fetch(`${webEnv.apiUrl}/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  await parseApiResponse<unknown>(response);
}

export async function completeAuthSession(accessToken: string, source: AuthSource) {
  const finalToken = await attachPendingTelegramContext(accessToken);
  clearProfileSnapshotCache();
  localStorage.setItem(tokenKey, finalToken);
  localStorage.setItem(authSourceKey, source);
  return finalToken;
}

async function attachPendingTelegramContext(authToken: string) {
  const pending = readPendingTelegramContext() ?? detectTelegramContextFromWindow();
  if (!pending) {
    return authToken;
  }

  try {
    const response = await fetch(`${webEnv.apiUrl}/${pending.kind === "telegram-webapp" ? "auth/telegram-webapp" : "auth/bot-webapp"}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`
      },
      body:
        pending.kind === "telegram-webapp"
          ? JSON.stringify({ initData: pending.initData, linkToken: pending.linkToken ?? undefined })
          : JSON.stringify({
              telegramId: pending.telegramId,
              chatId: pending.chatId,
              timestamp: pending.timestamp,
              signature: pending.signature,
              linkToken: pending.linkToken ?? undefined
            })
    });

    const payload = await parseApiResponse<AuthPayload>(response);
    clearPendingTelegramContext();
    return payload.accessToken;
  } catch {
    return authToken;
  }
}
