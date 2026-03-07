import * as React from "react";

import { cn } from "@/lib/cn";

export type TimePickerProps = React.InputHTMLAttributes<HTMLInputElement>;

const TimePicker = React.forwardRef<HTMLInputElement, TimePickerProps>(({ className, step = 60, ...props }, ref) => {
  return <input ref={ref} type="time" step={step} lang="en-GB" inputMode="numeric" className={cn("form-input", className)} {...props} />;
});

TimePicker.displayName = "TimePicker";

export { TimePicker };
