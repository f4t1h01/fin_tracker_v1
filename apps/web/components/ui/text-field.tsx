import * as React from "react";

import { cn } from "@/lib/cn";

export type TextFieldProps = React.InputHTMLAttributes<HTMLInputElement>;

const TextField = React.forwardRef<HTMLInputElement, TextFieldProps>(({ className, type = "text", ...props }, ref) => {
  return <input ref={ref} type={type} className={cn("field-control field-input", className)} {...props} />;
});

TextField.displayName = "TextField";

export { TextField };
