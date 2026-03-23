"use client";

import * as React from "react";

type FloatingPanelWidth = "anchor" | number;

type UseFloatingPanelPositionOptions = {
  anchorRef: React.RefObject<HTMLElement | null>;
  estimatedHeight: number;
  offset?: number;
  open: boolean;
  width: FloatingPanelWidth;
};

export function useFloatingPanelPosition(options: UseFloatingPanelPositionOptions) {
  const [style, setStyle] = React.useState<React.CSSProperties>({ opacity: 0 });

  const updatePosition = React.useCallback(() => {
    const anchor = options.anchorRef.current;
    if (!anchor) {
      return;
    }

    const rect = anchor.getBoundingClientRect();
    const offset = options.offset ?? 8;
    const width = options.width === "anchor" ? rect.width : options.width;
    const availableBelow = window.innerHeight - rect.bottom;
    const availableAbove = rect.top;
    const placeAbove = availableBelow < options.estimatedHeight && availableAbove > availableBelow;
    const top = placeAbove
      ? Math.max(16, rect.top - options.estimatedHeight - offset)
      : rect.bottom + offset;
    const maxHeight = Math.max(0, placeAbove ? availableAbove - offset : availableBelow - offset);
    const left = Math.max(16, Math.min(rect.left, window.innerWidth - width - 16));

    setStyle({
      left,
      opacity: 1,
      position: "fixed",
      maxHeight,
      top,
      width
    });
  }, [options.anchorRef, options.estimatedHeight, options.offset, options.width]);

  React.useLayoutEffect(() => {
    if (!options.open) {
      return;
    }

    updatePosition();

    const handleViewportChange = () => updatePosition();

    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [options.open, updatePosition]);

  return style;
}
