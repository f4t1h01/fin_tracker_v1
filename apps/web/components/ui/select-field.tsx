import * as React from "react";

import { cn } from "@/lib/cn";

export type SelectFieldProps = React.SelectHTMLAttributes<HTMLSelectElement>;

const SelectField = React.forwardRef<HTMLSelectElement, SelectFieldProps>(({ className, children, ...props }, ref) => {
  return <select ref={ref} className={cn("field-control field-select", className)} {...props}>{children}</select>;
});

SelectField.displayName = "SelectField";

export { SelectField };
