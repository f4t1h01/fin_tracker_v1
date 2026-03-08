export const themeStorageKey = "duet-theme";

const themeTransitionAttribute = "data-theme-transition";
const themeTransitionDurationMs = 220;

let themeTransitionTimer: number | null = null;

export type ThemeMode = "light" | "dark";

type ApplyThemeOptions = {
  animate?: boolean;
};

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

function setDocumentTheme(theme: ThemeMode) {
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  root.classList.toggle("dark", theme === "dark");
  root.classList.toggle("light", theme === "light");
}

function startThemeTransition() {
  const root = document.documentElement;

  root.setAttribute(themeTransitionAttribute, "active");

  if (themeTransitionTimer !== null) {
    window.clearTimeout(themeTransitionTimer);
  }

  themeTransitionTimer = window.setTimeout(() => {
    root.removeAttribute(themeTransitionAttribute);
    themeTransitionTimer = null;
  }, themeTransitionDurationMs);
}

export function applyTheme(theme: ThemeMode, options: ApplyThemeOptions = {}) {
  if (typeof document === "undefined") {
    return;
  }

  if (options.animate) {
    startThemeTransition();
  }

  setDocumentTheme(theme);
}

export function getThemeBootScript() {
  return `(() => {
    const applyTheme = (theme) => {
      document.documentElement.setAttribute('data-theme', theme);
      document.documentElement.classList.toggle('dark', theme === 'dark');
      document.documentElement.classList.toggle('light', theme === 'light');
    };

    try {
      const saved = window.localStorage.getItem('${themeStorageKey}');
      const system = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      const theme = saved === 'dark' || saved === 'light' ? saved : system;
      applyTheme(theme);
    } catch {
      applyTheme('light');
    }
  })();`;
}

export function persistTheme(theme: ThemeMode, options: ApplyThemeOptions = {}) {
  window.localStorage.setItem(themeStorageKey, theme);
  applyTheme(theme, options);
}
