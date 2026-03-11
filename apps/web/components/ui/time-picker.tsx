"use client";

import { Check, Clock3 } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/cn";
import { useDismissableLayer } from "@/components/ui/use-dismissable-layer";

type TimePickerProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">;

function buildTimeSlots(step: number) {
  const safeStep = Math.max(1, step);
  const slots: string[] = [];

  for (let minutes = 0; minutes < 24 * 60; minutes += safeStep) {
    const hours = `${Math.floor(minutes / 60)}`.padStart(2, "0");
    const mins = `${minutes % 60}`.padStart(2, "0");
    slots.push(`${hours}:${mins}`);
  }

  return slots;
}

const TimePicker = React.forwardRef<HTMLInputElement, TimePickerProps>(({ className, disabled, onBlur, placeholder, step = 60, value, ...props }, ref) => {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const panelRef = React.useRef<HTMLDivElement | null>(null);
  const stepMinutes = React.useMemo(() => {
    const parsed = typeof step === "number" ? step : Number(step);
    return Number.isFinite(parsed) ? parsed : 60;
  }, [step]);
  const slots = React.useMemo(() => buildTimeSlots(stepMinutes), [stepMinutes]);

  useDismissableLayer({
    open,
    onDismiss: () => setOpen(false),
    refs: [rootRef, panelRef]
  });

  const emitChange = React.useCallback((nextValue: string) => {
    props.onChange?.({
      currentTarget: { value: nextValue } as HTMLInputElement,
      target: { value: nextValue } as HTMLInputElement
    } as React.ChangeEvent<HTMLInputElement>);
    setOpen(false);
  }, [props]);

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <input
        ref={ref}
        type="text"
        readOnly
        disabled={disabled}
        inputMode="none"
        autoComplete="off"
        value={typeof value === "string" ? value : ""}
        placeholder={placeholder ?? "HH:MM"}
        className="field-control field-input picker-display-input pr-11"
        onClick={() => !disabled && setOpen(true)}
        onFocus={() => !disabled && setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " " || event.key === "ArrowDown") {
            event.preventDefault();
            if (!disabled) {
              setOpen(true);
            }
          }
        }}
        onBlur={onBlur}
        {...props}
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ink-soft)]">
        <Clock3 className="size-4" />
      </span>
      {open ? (
        <div
          ref={panelRef}
          className="absolute left-0 top-full z-30 mt-2 w-[280px] max-w-[calc(100vw-3rem)] rounded-[18px] border border-[rgba(201,168,76,0.2)] bg-[color-mix(in_srgb,var(--warm-white)_94%,transparent)] p-3 shadow-[0_18px_48px_rgba(26,20,16,0.2)] backdrop-blur-md dark:bg-[color-mix(in_srgb,var(--warm-white)_82%,transparent)]"
        >
          <div className="mb-3">
            <p className="font-[family-name:var(--font-heading)] text-[26px] font-light">Choose time</p>
            <p className="body-muted text-xs uppercase tracking-[0.16em]">Step {stepMinutes} minutes</p>
          </div>
          <div className="grid max-h-64 grid-cols-3 gap-2 overflow-y-auto pr-1">
            {slots.map((slot) => {
              const isSelected = slot === value;
              return (
                <button
                  key={slot}
                  type="button"
                  className={cn(
                    "flex items-center justify-between rounded-[10px] px-3 py-2 text-sm transition-colors",
                    isSelected ? "bg-[var(--gold)] text-[var(--marketing-dark)]" : "bg-transparent text-[var(--ink-soft)] hover:bg-[color-mix(in_srgb,var(--gold)_8%,transparent)] hover:text-[var(--ink)]"
                  )}
                  onClick={() => emitChange(slot)}
                >
                  <span>{slot}</span>
                  {isSelected ? <Check className="size-4" /> : null}
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex items-center justify-between gap-3 border-t border-[rgba(201,168,76,0.14)] pt-3">
            <button type="button" className="text-xs uppercase tracking-[0.16em] text-[var(--ink-soft)] transition-colors hover:text-[var(--ink)] disabled:opacity-40" disabled={!value} onClick={() => emitChange("")}>
              Clear
            </button>
            <button type="button" className="text-xs uppercase tracking-[0.16em] text-[var(--gold)] transition-colors hover:text-[var(--ink)]" onClick={() => emitChange("00:00")}>
              Midnight
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
});

TimePicker.displayName = "TimePicker";

export { TimePicker };
