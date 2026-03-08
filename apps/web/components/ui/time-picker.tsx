"use client";

import { Clock3 } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/cn";

type TimePickerProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">;

const TimePicker = React.forwardRef<HTMLInputElement, TimePickerProps>(({ className, onBlur, placeholder, step = 60, value, ...props }, ref) => {
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
        ref={ref}
        type="text"
        readOnly
        value={typeof value === "string" ? value : ""}
        placeholder={placeholder ?? "HH:MM"}
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
        {...props}
      />
      <input ref={nativeInputRef} tabIndex={-1} aria-hidden="true" type="time" step={step} className="picker-native-input" value={value} onChange={props.onChange} />
      <button type="button" className="picker-trigger" aria-label="Open time picker" onClick={openPicker}>
        <Clock3 className="size-4" />
      </button>
    </div>
  );
});

TimePicker.displayName = "TimePicker";

export { TimePicker };
