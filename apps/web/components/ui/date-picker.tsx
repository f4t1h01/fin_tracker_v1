"use client";

import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import * as React from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/cn";
import { useDismissableLayer } from "@/components/ui/use-dismissable-layer";
import { useFloatingPanelPosition } from "@/components/ui/use-floating-panel-position";

type DatePickerProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "onChange"> & {
  value?: string;
  onChange?: (value: string) => void;
};

const displayFormatter = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
});

const monthFormatter = new Intl.DateTimeFormat(undefined, {
  month: "long",
  year: "numeric"
});

const weekdayFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "short"
});

const monthNameFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short"
});

function parseIsoDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const parsed = new Date(year, month, day);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatIsoDate(value: Date) {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateValue(value: string) {
  const parsed = parseIsoDate(value);
  return parsed ? displayFormatter.format(parsed) : value;
}

function startOfMonth(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

function addMonths(value: Date, count: number) {
  return new Date(value.getFullYear(), value.getMonth() + count, 1);
}

function startOfWeekMonday(value: Date) {
  const copy = new Date(value);
  const day = copy.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + offset);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function isSameDate(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate();
}

function isDateDisabled(value: Date, minDate: Date | null, maxDate: Date | null) {
  const time = value.getTime();
  return Boolean((minDate && time < minDate.getTime()) || (maxDate && time > maxDate.getTime()));
}

function buildCalendarDays(month: Date) {
  const firstDay = startOfWeekMonday(startOfMonth(month));
  return Array.from({ length: 42 }, (_, index) => {
    const next = new Date(firstDay);
    next.setDate(firstDay.getDate() + index);
    return next;
  });
}

const DatePicker = React.forwardRef<HTMLInputElement, DatePickerProps>(({ className, disabled, max, min, onBlur, onChange, placeholder, value = "", ...props }, ref) => {
  const [open, setOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<"days" | "months" | "years">("days");
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const panelRef = React.useRef<HTMLDivElement | null>(null);
  const today = React.useMemo(() => {
    const next = new Date();
    next.setHours(0, 0, 0, 0);
    return next;
  }, []);
  const selectedDate = React.useMemo(() => parseIsoDate(value), [value]);
  const minDate = React.useMemo(() => parseIsoDate(typeof min === "string" ? min : ""), [min]);
  const maxDate = React.useMemo(() => parseIsoDate(typeof max === "string" ? max : ""), [max]);
  const [visibleMonth, setVisibleMonth] = React.useState(() => startOfMonth(selectedDate ?? today));

  useDismissableLayer({
    open,
    onDismiss: () => setOpen(false),
    refs: [rootRef, panelRef]
  });

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (open) {
      setVisibleMonth(startOfMonth(selectedDate ?? today));
      setViewMode("days");
    }
  }, [open, selectedDate, today]);

  const panelStyle = useFloatingPanelPosition({
    anchorRef: rootRef,
    estimatedHeight: 400,
    open,
    width: 300
  });

  const weekdayLabels = React.useMemo(() => {
    const monday = startOfWeekMonday(new Date(2024, 0, 1));
    return Array.from({ length: 7 }, (_, index) => {
      const next = new Date(monday);
      next.setDate(monday.getDate() + index);
      return weekdayFormatter.format(next);
    });
  }, []);

  const calendarDays = React.useMemo(() => buildCalendarDays(visibleMonth), [visibleMonth]);
  const monthOptions = React.useMemo(() => {
    return Array.from({ length: 12 }, (_, index) => monthNameFormatter.format(new Date(2024, index, 1)));
  }, []);
  const visibleYear = visibleMonth.getFullYear();
  const yearOptions = React.useMemo(() => {
    const startYear = visibleYear - 7;
    return Array.from({ length: 16 }, (_, index) => startYear + index);
  }, [visibleYear]);

  const selectDate = React.useCallback((nextDate: Date | null) => {
    onChange?.(nextDate ? formatIsoDate(nextDate) : "");
    setOpen(false);
  }, [onChange]);

  const shiftVisibleRange = React.useCallback((direction: -1 | 1) => {
    if (viewMode === "years") {
      setVisibleMonth((current) => new Date(current.getFullYear() + direction * 16, current.getMonth(), 1));
      return;
    }

    if (viewMode === "months") {
      setVisibleMonth((current) => new Date(current.getFullYear() + direction, current.getMonth(), 1));
      return;
    }

    setVisibleMonth((current) => addMonths(current, direction));
  }, [viewMode]);

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <input
        {...props}
        ref={ref}
        type="text"
        readOnly
        disabled={disabled}
        inputMode="none"
        autoComplete="off"
        placeholder={placeholder ?? "Select date"}
        className="field-control field-input picker-display-input pr-11"
        value={formatDateValue(value)}
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
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ink-soft)]">
        <CalendarDays className="size-4" />
      </span>
      {open && mounted ? createPortal(
        <div
          ref={panelRef}
          style={panelStyle}
          className="z-[220] max-w-[calc(100vw-3rem)] rounded-[18px] border border-[rgba(201,168,76,0.2)] bg-[color-mix(in_srgb,var(--warm-white)_94%,transparent)] p-4 shadow-[0_18px_48px_rgba(26,20,16,0.2)] backdrop-blur-md dark:bg-[color-mix(in_srgb,var(--warm-white)_82%,transparent)]"
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <button type="button" className="rounded-[10px] border border-[rgba(201,168,76,0.18)] p-2 text-[var(--ink-soft)] transition-colors hover:border-[var(--gold)] hover:text-[var(--ink)]" onClick={() => shiftVisibleRange(-1)}>
              <ChevronLeft className="size-4" />
            </button>
            <div className="flex items-center gap-2">
              <button type="button" className={cn("rounded-[10px] px-2 py-1 font-[family-name:var(--font-heading)] text-[26px] font-light transition-colors hover:text-[var(--gold)]", viewMode === "months" ? "text-[var(--gold)]" : "text-[var(--ink)]")} onClick={() => setViewMode("months")}>
                {monthNameFormatter.format(visibleMonth)}
              </button>
              <button type="button" className={cn("rounded-[10px] px-2 py-1 font-[family-name:var(--font-heading)] text-[26px] font-light transition-colors hover:text-[var(--gold)]", viewMode === "years" ? "text-[var(--gold)]" : "text-[var(--ink)]")} onClick={() => setViewMode("years")}>
                {visibleYear}
              </button>
            </div>
            <button type="button" className="rounded-[10px] border border-[rgba(201,168,76,0.18)] p-2 text-[var(--ink-soft)] transition-colors hover:border-[var(--gold)] hover:text-[var(--ink)]" onClick={() => shiftVisibleRange(1)}>
              <ChevronRight className="size-4" />
            </button>
          </div>

          {viewMode === "days" ? (
            <>
              <div className="mb-2 grid grid-cols-7 gap-1">
                {weekdayLabels.map((label) => (
                  <span key={label} className="py-2 text-center text-[11px] uppercase tracking-[0.16em] text-[var(--ink-soft)]">
                    {label}
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day) => {
                  const outsideMonth = day.getMonth() !== visibleMonth.getMonth();
                  const disabledDay = isDateDisabled(day, minDate, maxDate);
                  const selectedDay = selectedDate ? isSameDate(day, selectedDate) : false;
                  const todayDay = isSameDate(day, today);

                  return (
                    <button
                      key={formatIsoDate(day)}
                      type="button"
                      disabled={disabledDay}
                      className={cn(
                        "h-10 rounded-[10px] text-sm transition-colors",
                        selectedDay ? "bg-[var(--gold)] text-[var(--marketing-dark)]" : "text-[var(--ink)] hover:bg-[color-mix(in_srgb,var(--gold)_10%,transparent)]",
                        outsideMonth ? "opacity-45" : "",
                        todayDay && !selectedDay ? "border border-[rgba(201,168,76,0.28)]" : "",
                        disabledDay ? "cursor-not-allowed opacity-30" : ""
                      )}
                      onClick={() => selectDate(day)}
                    >
                      {day.getDate()}
                    </button>
                  );
                })}
              </div>
            </>
          ) : null}

          {viewMode === "months" ? (
            <div className="grid grid-cols-3 gap-2">
              {monthOptions.map((label, index) => {
                const candidate = new Date(visibleYear, index, 1);
                const isSelectedMonth = selectedDate && selectedDate.getFullYear() === visibleYear && selectedDate.getMonth() === index;

                return (
                  <button
                    key={label}
                    type="button"
                    className={cn(
                      "rounded-[10px] px-3 py-4 text-sm transition-colors",
                      isSelectedMonth ? "bg-[var(--gold)] text-[var(--marketing-dark)]" : "text-[var(--ink-soft)] hover:bg-[color-mix(in_srgb,var(--gold)_8%,transparent)] hover:text-[var(--ink)]"
                    )}
                    onClick={() => {
                      setVisibleMonth(candidate);
                      setViewMode("days");
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          ) : null}

          {viewMode === "years" ? (
            <div className="grid grid-cols-4 gap-2">
              {yearOptions.map((year) => {
                const isSelectedYear = selectedDate?.getFullYear() === year;
                return (
                  <button
                    key={year}
                    type="button"
                    className={cn(
                      "rounded-[10px] px-3 py-4 text-sm transition-colors",
                      isSelectedYear ? "bg-[var(--gold)] text-[var(--marketing-dark)]" : "text-[var(--ink-soft)] hover:bg-[color-mix(in_srgb,var(--gold)_8%,transparent)] hover:text-[var(--ink)]"
                    )}
                    onClick={() => {
                      setVisibleMonth(new Date(year, visibleMonth.getMonth(), 1));
                      setViewMode("months");
                    }}
                  >
                    {year}
                  </button>
                );
              })}
            </div>
          ) : null}

          <div className="mt-4 flex items-center justify-between gap-3 border-t border-[rgba(201,168,76,0.14)] pt-3">
            <button type="button" className="text-xs uppercase tracking-[0.16em] text-[var(--ink-soft)] transition-colors hover:text-[var(--ink)] disabled:opacity-40" disabled={!value} onClick={() => selectDate(null)}>
              Clear
            </button>
            <button type="button" className="text-xs uppercase tracking-[0.16em] text-[var(--gold)] transition-colors hover:text-[var(--ink)]" onClick={() => selectDate(today)}>
              Today
            </button>
          </div>
        </div>,
        document.body
      ) : null}
    </div>
  );
});

DatePicker.displayName = "DatePicker";

export { DatePicker };
