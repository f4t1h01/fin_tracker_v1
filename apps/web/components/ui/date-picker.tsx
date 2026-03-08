"use client";

import * as React from "react";

import { cn } from "@/lib/cn";

type DatePickerProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "onChange"> & {
  value?: string;
  onChange?: (value: string) => void;
};

function formatDateForDisplay(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function maskDateInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);

  if (digits.length <= 2) {
    return digits;
  }

  if (digits.length <= 4) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }

  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function isValidIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [yearText, monthText, dayText] = value.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));

  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function parseDisplayDate(value: string) {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
    return null;
  }

  const [day, month, year] = value.split("/");
  const isoValue = `${year}-${month}-${day}`;
  return isValidIsoDate(isoValue) ? isoValue : null;
}

const DatePicker = React.forwardRef<HTMLInputElement, DatePickerProps>(({ className, max, min, onBlur, onChange, placeholder, value = "", ...props }, ref) => {
  const [displayValue, setDisplayValue] = React.useState(() => formatDateForDisplay(value));

  React.useEffect(() => {
    setDisplayValue(formatDateForDisplay(value));
  }, [value]);

  return (
    <input
      {...props}
      ref={ref}
      type="text"
      inputMode="numeric"
      autoComplete="bday"
      maxLength={10}
      placeholder={placeholder ?? "DD/MM/YYYY"}
      value={displayValue}
      className={cn("field-control field-input form-date-input", className)}
      onChange={(event) => {
        const nextDisplayValue = maskDateInput(event.target.value);
        const parsedValue = parseDisplayDate(nextDisplayValue);

        setDisplayValue(nextDisplayValue);

        if (!nextDisplayValue) {
          onChange?.("");
          return;
        }

        if (!parsedValue) {
          return;
        }

        if ((min && parsedValue < min) || (max && parsedValue > max)) {
          return;
        }

        onChange?.(parsedValue);
      }}
      onBlur={(event) => {
        setDisplayValue(formatDateForDisplay(value));
        onBlur?.(event);
      }}
    />
  );
});

DatePicker.displayName = "DatePicker";

export { DatePicker };
