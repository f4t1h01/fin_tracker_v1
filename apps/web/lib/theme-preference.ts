import { tokenKey } from "@/components/profile/types";

import { webEnv } from "./env";
import type { ThemeMode } from "./theme";

export async function syncAuthenticatedThemePreference(theme: ThemeMode) {
  if (typeof window === "undefined") {
    return;
  }

  const token = window.localStorage.getItem(tokenKey);
  if (!token) {
    return;
  }

  const response = await fetch(`${webEnv.apiUrl}/auth/preferences/theme`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ isDark: theme === "dark" })
  });

  if (!response.ok) {
    throw new Error("Could not save theme preference");
  }
}
