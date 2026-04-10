"use client";

import { Check, ChevronDown } from "lucide-react";
import * as React from "react";
import { createPortal } from "react-dom";

import { useDismissableLayer } from "@/components/ui/use-dismissable-layer";
import { useFloatingPanelPosition } from "@/components/ui/use-floating-panel-position";
import { cn } from "@/lib/cn";

import { currencyLabels, supportedCurrencies, type SupportedCurrency } from "@/components/profile/types";

type DashboardRatesSelectorProps = {
  value: SupportedCurrency[];
  disabled?: boolean;
  onChange: (nextValue: SupportedCurrency[]) => void;
};

function normalizeSelection(values: SupportedCurrency[]) {
  const selected = new Set(values);
  return supportedCurrencies.filter((currency) => selected.has(currency));
}

function formatSelectionSummary(value: SupportedCurrency[]) {
  if (value.length === 0) {
    return "Select currencies";
  }

  if (value.length <= 3) {
    return value.join(" · ");
  }

  return `${value.slice(0, 3).join(" · ")} +${value.length - 3}`;
}

export function DashboardRatesSelector({ value, disabled, onChange }: DashboardRatesSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const panelRef = React.useRef<HTMLDivElement | null>(null);

  useDismissableLayer({
    open,
    onDismiss: () => setOpen(false),
    refs: [rootRef, panelRef]
  });

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const estimatedHeight = Math.min(360, Math.max(120, supportedCurrencies.length * 52 + 24));
  const panelStyle = useFloatingPanelPosition({
    anchorRef: rootRef,
    estimatedHeight,
    open,
    width: "anchor"
  });

  const summary = React.useMemo(() => formatSelectionSummary(value), [value]);

  const toggleCurrency = React.useCallback(
    (currency: SupportedCurrency) => {
      const selected = value.includes(currency)
        ? value.filter((item) => item !== currency)
        : [...value, currency];
      const normalized = normalizeSelection(selected);

      if (normalized.length === 0) {
        return;
      }

      onChange(normalized);
    },
    [onChange, value]
  );

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "field-control field-select flex min-h-[56px] w-full items-center justify-between gap-3 text-left",
          disabled ? "cursor-not-allowed opacity-60" : ""
        )}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
          {value.length > 0 ? (
            value.length <= 3 ? (
              value.map((currency) => (
                <span
                  key={currency}
                  className="rounded-full border border-[rgba(201,168,76,0.18)] bg-[color-mix(in_srgb,var(--gold)_10%,transparent)] px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ink)]"
                >
                  {currency}
                </span>
              ))
            ) : (
              <>
                {value.slice(0, 3).map((currency) => (
                  <span
                    key={currency}
                    className="rounded-full border border-[rgba(201,168,76,0.18)] bg-[color-mix(in_srgb,var(--gold)_10%,transparent)] px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ink)]"
                  >
                    {currency}
                  </span>
                ))}
                <span className="rounded-full border border-[rgba(201,168,76,0.16)] px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-soft)]">
                  +{value.length - 3}
                </span>
              </>
            )
          ) : (
            <span className="text-[var(--ink-soft)]">{summary}</span>
          )}
        </span>
        <ChevronDown className={cn("size-4 shrink-0 text-[var(--ink-soft)] transition-transform duration-200", open ? "rotate-180" : "")} />
      </button>

      {open && mounted ? (
        createPortal(
          <div
            ref={panelRef}
            role="listbox"
            aria-multiselectable="true"
            style={panelStyle}
            className="z-[220] max-h-[24rem] overflow-y-auto rounded-[20px] border border-[rgba(201,168,76,0.2)] bg-[color-mix(in_srgb,var(--warm-white)_92%,transparent)] p-2 shadow-[0_18px_48px_rgba(26,20,16,0.18)] backdrop-blur-md dark:bg-[color-mix(in_srgb,var(--warm-white)_82%,transparent)]"
          >
            <div className="space-y-1">
              {supportedCurrencies.map((currency) => {
                const isSelected = value.includes(currency);
                const isLocked = isSelected && value.length === 1;

                return (
                  <button
                    key={currency}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    disabled={disabled || isLocked}
                    className={cn(
                      "flex w-full items-start justify-between gap-3 rounded-[14px] px-3 py-3 text-left text-sm transition-colors",
                      isSelected
                        ? "bg-[color-mix(in_srgb,var(--gold)_12%,transparent)] text-[var(--ink)]"
                        : "text-[var(--ink-soft)] hover:bg-[color-mix(in_srgb,var(--gold)_8%,transparent)] hover:text-[var(--ink)]",
                      disabled || isLocked ? "cursor-not-allowed opacity-45" : ""
                    )}
                    onClick={() => toggleCurrency(currency)}
                  >
                    <span className="min-w-0 space-y-1">
                      <span className="block font-semibold uppercase tracking-[0.12em]">{currency}</span>
                      <span className="block text-xs leading-5 text-[var(--ink-soft)]">{currencyLabels[currency]}</span>
                    </span>
                    {isSelected ? <Check className="mt-0.5 size-4 shrink-0 text-[var(--gold)]" /> : null}
                  </button>
                );
              })}
            </div>
            <p className="px-3 pb-2 pt-3 text-xs leading-5 text-[var(--ink-soft)]">
              Keep at least one currency selected. Changes below are preview-only until you save them.
            </p>
          </div>,
          document.body
        )
      ) : null}
    </div>
  );
}
