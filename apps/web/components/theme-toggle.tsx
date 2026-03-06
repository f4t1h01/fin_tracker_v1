"use client";

import { Moon, SunMedium } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

const storageKey = "cf_theme";

function getPreferredTheme() {
  if (typeof window === "undefined") {
    return "dark";
  }

  const saved = window.localStorage.getItem(storageKey);
  if (saved === "light" || saved === "dark") {
    return saved;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: "light" | "dark") {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const preferred = getPreferredTheme();
    setTheme(preferred);
    applyTheme(preferred);
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
    window.localStorage.setItem(storageKey, next);
  };

  return (
    <Button aria-label="Toggle theme" className="fixed right-4 top-4 z-50 shadow-lg shadow-black/10" variant="outline" onClick={toggleTheme}>
      {theme === "dark" ? <SunMedium className="size-4" /> : <Moon className="size-4" />}
      <span>{theme === "dark" ? "Light" : "Dark"}</span>
    </Button>
  );
}
