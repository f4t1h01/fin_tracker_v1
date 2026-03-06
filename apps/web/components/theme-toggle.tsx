"use client";

import { Moon, SunMedium } from "lucide-react";
import { useEffect, useState } from "react";

const storageKey = "duet-theme";

function getSystemTheme() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: "light" | "dark") {
  document.documentElement.setAttribute("data-theme", theme);
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    const initial = saved === "light" || saved === "dark" ? saved : getSystemTheme();
    setTheme(initial);
    applyTheme(initial);

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = (event: MediaQueryListEvent) => {
      if (window.localStorage.getItem(storageKey)) {
        return;
      }

      const next = event.matches ? "dark" : "light";
      setTheme(next);
      applyTheme(next);
    };

    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    applyTheme(next);
    window.localStorage.setItem(storageKey, next);
  };

  return (
    <button aria-label="Toggle color theme" className="theme-pill" type="button" onClick={toggleTheme}>
      <SunMedium className="theme-icon theme-icon--sun size-3.5" />
      <Moon className="theme-icon theme-icon--moon size-3.5" />
    </button>
  );
}
