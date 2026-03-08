import * as React from "react";

import { cn } from "@/lib/cn";

export type TextareaFieldProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const TextareaField = React.forwardRef<HTMLTextAreaElement, TextareaFieldProps>(({ className, ...props }, ref) => {
  return <textarea ref={ref} className={cn("field-control field-textarea", className)} {...props} />;
});

TextareaField.displayName = "TextareaField";

export { TextareaField };
