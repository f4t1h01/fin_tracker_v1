"use client";

import * as React from "react";

type UseDismissableLayerOptions = {
  open: boolean;
  onDismiss: () => void;
  refs: Array<React.RefObject<HTMLElement | null>>;
};

export function useDismissableLayer(options: UseDismissableLayerOptions) {
  React.useEffect(() => {
    if (!options.open) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) {
        return;
      }

      const clickedInside = options.refs.some((ref) => ref.current?.contains(target));
      if (!clickedInside) {
        options.onDismiss();
      }
    };

    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target as Node | null;
      if (!target) {
        return;
      }

      const focusedInside = options.refs.some((ref) => ref.current?.contains(target));
      if (!focusedInside) {
        options.onDismiss();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        options.onDismiss();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("focusin", handleFocusIn);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("focusin", handleFocusIn);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [options]);
}
