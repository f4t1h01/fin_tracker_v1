"use client";

import type { LucideIcon } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/cn";

type AgentIconButtonProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  icon: LucideIcon;
  /** Used for both the tooltip and the accessible name, so it is never optional. */
  label: string;
  tone?: "plain" | "active";
  size?: "sm" | "md";
};

/**
 * The one round control used across the agent surface: sidebar row actions, top
 * bar actions and composer tools. Keeping it here is what stops the three from
 * drifting into three slightly different circles.
 */
export const AgentIconButton = React.forwardRef<HTMLButtonElement, AgentIconButtonProps>(function AgentIconButton(
  { icon: Icon, label, tone = "plain", size = "md", className, type = "button", ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      title={label}
      aria-label={label}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full border transition-[background-color,border-color,color,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-45",
        size === "sm" ? "size-7" : "size-10",
        tone === "active"
          ? "border-[rgba(201,168,76,0.34)] bg-[color-mix(in_srgb,var(--gold)_14%,transparent)] text-[var(--gold)]"
          : "border-[rgba(201,168,76,0.16)] bg-[color-mix(in_srgb,var(--warm-white)_58%,transparent)] text-[var(--ink-soft)] enabled:hover:border-[rgba(201,168,76,0.34)] enabled:hover:bg-[color-mix(in_srgb,var(--warm-white)_86%,transparent)] enabled:hover:text-[var(--ink)]",
        className
      )}
      {...props}
    >
      <Icon className={size === "sm" ? "size-3.5" : "size-[18px]"} />
    </button>
  );
});
