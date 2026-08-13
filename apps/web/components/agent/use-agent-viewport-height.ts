"use client";

import { useEffect } from "react";

const viewportHeightVariable = "--agent-viewport-height";

/** Above this, the user has pinch-zoomed and the visual viewport is not the app's frame. */
const zoomTolerance = 1.01;

/**
 * Keeps the chat shell exactly as tall as the *visible* viewport.
 *
 * `100dvh` already copes with collapsing browser chrome, but iOS Safari does not
 * shrink the layout viewport when the on-screen keyboard opens, which would bury
 * the composer under the keyboard — the one thing a chat screen cannot afford.
 * visualViewport reports the real number there.
 *
 * The measurement is deliberately defensive: it is capped by the layout viewport
 * so a missed event can never leave the shell taller than the window, it ignores
 * pinch-zoom (which shrinks the visual viewport while the layout is unchanged),
 * and it falls back to the `100dvh` in the stylesheet if the number is unusable.
 */
export function useAgentViewportHeight() {
  useEffect(() => {
    const viewport = window.visualViewport;

    const sync = () => {
      const layoutHeight = window.innerHeight;
      const isZoomed = viewport ? viewport.scale > zoomTolerance : false;
      const height = viewport && !isZoomed ? Math.min(viewport.height, layoutHeight) : layoutHeight;

      if (!Number.isFinite(height) || height <= 0) {
        document.documentElement.style.removeProperty(viewportHeightVariable);
        return;
      }

      document.documentElement.style.setProperty(viewportHeightVariable, `${Math.round(height)}px`);
    };

    sync();
    window.addEventListener("resize", sync);
    window.addEventListener("orientationchange", sync);
    viewport?.addEventListener("resize", sync);

    return () => {
      window.removeEventListener("resize", sync);
      window.removeEventListener("orientationchange", sync);
      viewport?.removeEventListener("resize", sync);
      document.documentElement.style.removeProperty(viewportHeightVariable);
    };
  }, []);
}
