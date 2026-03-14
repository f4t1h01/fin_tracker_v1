"use client";

import { cn } from "@/lib/cn";

type TogglePillProps = {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onToggle: (nextValue: boolean) => void;
};

export function TogglePill(props: TogglePillProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={props.checked}
      disabled={props.disabled}
      className={cn(
        "group flex w-full items-center justify-between gap-4 rounded-[18px] border px-4 py-3 text-left transition-colors",
        "border-[rgba(201,168,76,0.18)] bg-[color-mix(in_srgb,var(--panel)_86%,transparent)]",
        "hover:border-[rgba(201,168,76,0.3)] hover:bg-[color-mix(in_srgb,var(--panel)_92%,transparent)]",
        props.disabled ? "cursor-not-allowed opacity-55" : ""
      )}
      onClick={() => props.onToggle(!props.checked)}
    >
      <span className="text-sm font-medium text-[var(--ink)]">{props.label}</span>
      <span
        className={cn(
          "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors",
          props.checked
            ? "border-[rgba(201,168,76,0.45)] bg-[color-mix(in_srgb,var(--gold)_22%,transparent)]"
            : "border-[rgba(201,168,76,0.14)] bg-[color-mix(in_srgb,var(--panel)_78%,black_6%)]"
        )}
      >
        <span
          className={cn(
            "absolute size-4 rounded-full transition-all",
            props.checked
              ? "left-[26px] bg-[var(--gold)] shadow-[0_0_18px_rgba(201,168,76,0.35)]"
              : "left-[4px] bg-[color-mix(in_srgb,var(--ink-soft)_72%,var(--panel))]"
          )}
        />
      </span>
    </button>
  );
}
