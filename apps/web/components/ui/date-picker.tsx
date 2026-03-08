"use client";

import { CalendarDays } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/cn";

type DatePickerProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "onChange"> & {
  value?: string;
  onChange?: (value: string) => void;
};
const DatePicker = React.forwardRef<HTMLInputElement, DatePickerProps>(({ className, max, min, onChange, value = "", ...props }, ref) => {
  return (
    <div className={cn("picker-shell", className)}>
      <input
        {...props}
        ref={ref}
        lang="en-GB"
        autoComplete="bday"
        type="date"
        className="field-control field-input picker-date-input"
        value={value}
        min={min}
        max={max}
        onChange={(event) => onChange?.(event.target.value)}
      />
      <span className="picker-icon" aria-hidden="true">
        <CalendarDays className="size-4" />
      </span>
    </div>
  );
});

DatePicker.displayName = "DatePicker";

export { DatePicker };
