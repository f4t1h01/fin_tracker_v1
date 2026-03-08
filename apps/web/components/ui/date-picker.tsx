"use client";

import { CalendarDays } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/cn";

type DatePickerProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "onChange"> & {
  value?: string;
  onChange?: (value: string) => void;
};

function formatDateForDisplay(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return "";
  }

  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

const DatePicker = React.forwardRef<HTMLInputElement, DatePickerProps>(({ className, max, min, onBlur, onChange, placeholder, value = "", ...props }, ref) => {
  const nativeInputRef = React.useRef<HTMLInputElement | null>(null);

  const openPicker = React.useCallback(() => {
    const input = nativeInputRef.current;
    if (!input) {
      return;
    }

    if (typeof input.showPicker === "function") {
      input.showPicker();
      return;
    }

    input.focus();
    input.click();
  }, []);

  return (
    <div className={cn("picker-shell", className)}>
      <input
        {...props}
        ref={ref}
        type="text"
        readOnly
        autoComplete="bday"
        placeholder={placeholder ?? "DD/MM/YYYY"}
        value={formatDateForDisplay(value)}
        className="field-control field-input picker-display-input"
        onClick={openPicker}
        onFocus={openPicker}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " " || event.key === "ArrowDown") {
            event.preventDefault();
            openPicker();
          }
        }}
        onBlur={onBlur}
      />
      <input
        ref={nativeInputRef}
        tabIndex={-1}
        aria-hidden="true"
        type="date"
        className="picker-native-input"
        value={value}
        min={min}
        max={max}
        onChange={(event) => onChange?.(event.target.value)}
      />
      <button type="button" className="picker-trigger" aria-label="Open date picker" onClick={openPicker}>
        <CalendarDays className="size-4" />
      </button>
    </div>
  );
});

DatePicker.displayName = "DatePicker";

export { DatePicker };
