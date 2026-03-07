import * as React from "react";

import { cn } from "@/lib/cn";

export type DatePickerProps = React.InputHTMLAttributes<HTMLInputElement>;

const DatePicker = React.forwardRef<HTMLInputElement, DatePickerProps>(({ className, ...props }, ref) => {
  return <input ref={ref} type="date" className={cn("form-input", className)} {...props} />;
});

DatePicker.displayName = "DatePicker";

export { DatePicker };
