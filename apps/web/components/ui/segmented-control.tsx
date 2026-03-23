"use client";

import * as React from "react";

import { cn } from "@/lib/cn";

type SegmentedOption<T extends string> = {
  value: T;
  label: React.ReactNode;
};

type SegmentedControlProps<T extends string> = {
  ariaLabel: string;
  className?: string;
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
};

export function SegmentedControl<T extends string>({ ariaLabel, className, options, value, onChange }: SegmentedControlProps<T>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex rounded-full border border-[rgba(201,168,76,0.18)] bg-[color-mix(in_srgb,var(--warm-white)_84%,transparent)] p-1 shadow-[0_10px_24px_rgba(26,20,16,0.06)]",
        className
      )}
    >
      {options.map((option) => {
        const active = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "min-w-[84px] rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(201,168,76,0.35)]",
              active
                ? "bg-[var(--gold)] text-[var(--marketing-dark)] shadow-[0_8px_18px_rgba(201,168,76,0.22)]"
                : "text-[var(--ink-soft)] hover:bg-[color-mix(in_srgb,var(--gold)_10%,transparent)] hover:text-[var(--ink)]"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
