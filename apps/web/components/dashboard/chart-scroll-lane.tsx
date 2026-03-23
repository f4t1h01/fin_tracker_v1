"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

type ChartScrollLaneProps = {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
};

export function ChartScrollLane({ children, className, innerClassName }: ChartScrollLaneProps) {
  return (
    <div className={cn("max-w-full min-w-0 overflow-x-scroll overflow-y-hidden dashboard-scrollbar pb-4", className)}>
      <div className={cn("flex w-max min-w-full items-end gap-4 pr-4", innerClassName)}>{children}</div>
    </div>
  );
}
