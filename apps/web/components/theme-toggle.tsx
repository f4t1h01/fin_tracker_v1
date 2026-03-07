"use client";

import { Moon, SunMedium } from "lucide-react";
import { useEffect, useState } from "react";

import { applyTheme, getSystemTheme, persistTheme, resolveThemePreference, type ThemeMode, themeStorageKey } from "@/lib/theme";

type ThemeToggleProps = {
  onChange?: (theme: ThemeMode) => void;
};

export function ThemeToggle({ onChange }: ThemeToggleProps) {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof document !== "undefined") {
      const fromDom = document.documentElement.getAttribute("data-theme");
      if (fromDom === "light" || fromDom === "dark") {
        return fromDom;
      }
    }

    if (typeof window !== "undefined") {
      return resolveThemePreference();
    }

    return "light";
  });

  useEffect(() => {
    const initial = resolveThemePreference();
    if (document.documentElement.getAttribute("data-theme") !== initial) {
      applyTheme(initial);
    }
    setTheme(initial);

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = (event: MediaQueryListEvent) => {
      if (window.localStorage.getItem(themeStorageKey)) {
        return;
      }

      const next: ThemeMode = event.matches ? "dark" : "light";
      setTheme(next);
      applyTheme(next);
      onChange?.(next);
    };

    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [onChange]);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    persistTheme(next);
    onChange?.(next);
  };

  return (
    <button aria-label="Toggle color theme" className="theme-pill" type="button" onClick={toggleTheme}>
      <SunMedium className="theme-icon theme-icon--sun size-3.5" />
      <Moon className="theme-icon theme-icon--moon size-3.5" />
    </button>
  );
}
