"use client";

import { Moon, SunMedium } from "lucide-react";
import { useEffect, useState } from "react";

import { applyTheme, getSystemTheme, persistTheme, resolveThemePreference, type ThemeMode, themeStorageKey } from "@/lib/theme";

type ThemeToggleProps = {
  onChange?: (theme: ThemeMode) => void;
};

export function ThemeToggle({ onChange }: ThemeToggleProps) {
  const [theme, setTheme] = useState<ThemeMode>("light");

  useEffect(() => {
    const initial = resolveThemePreference();
    setTheme(initial);
    applyTheme(initial);

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
  }, []);

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
