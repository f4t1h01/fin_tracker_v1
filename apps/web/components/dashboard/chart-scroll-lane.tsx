"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

type ChartScrollLaneProps = {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
  itemCount?: number;
  minItemWidth?: number;
  gapPx?: number;
};

export function ChartScrollLane({
  children,
  className,
  innerClassName,
  itemCount,
  minItemWidth = 88,
  gapPx = 16
}: ChartScrollLaneProps) {
  const laneWidth =
    itemCount && itemCount > 0 ? `max(100%, calc(${itemCount} * ${minItemWidth}px + ${(itemCount - 1) * gapPx}px))` : "100%";

  return (
    <div className={cn("max-w-full min-w-0 overflow-x-scroll overflow-y-hidden dashboard-scrollbar pb-4", className)}>
      <div className={cn("flex min-w-full items-end gap-4 pr-1", innerClassName)} style={{ width: laneWidth }}>
        {children}
      </div>
    </div>
  );
}
