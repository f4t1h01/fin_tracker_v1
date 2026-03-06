export const themeStorageKey = "duet-theme";

export type ThemeMode = "light" | "dark";

export function getSystemTheme(): ThemeMode {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function resolveThemePreference(): ThemeMode {
  if (typeof window === "undefined") {
    return "light";
  }

  const saved = window.localStorage.getItem(themeStorageKey);
  if (saved === "light" || saved === "dark") {
    return saved;
  }

  return getSystemTheme();
}

export function applyTheme(theme: ThemeMode) {
  document.documentElement.setAttribute("data-theme", theme);
}

export function persistTheme(theme: ThemeMode) {
  window.localStorage.setItem(themeStorageKey, theme);
  applyTheme(theme);
}
