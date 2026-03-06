import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "@radix-ui/react-slot";
import * as React from "react";

import { cn } from "@/lib/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pop disabled:pointer-events-none disabled:opacity-60",
  {
    variants: {
      variant: {
        default: "bg-accent text-accent-foreground shadow-lg shadow-[hsl(var(--shadow-tint)/0.18)] hover:-translate-y-0.5 hover:opacity-95",
        outline: "border bg-[hsl(var(--card)/0.72)] text-ink hover:-translate-y-0.5 hover:bg-[hsl(var(--card)/0.96)]",
        ghost: "text-ink hover:bg-[hsl(var(--card)/0.66)]"
      },
      size: {
        default: "h-10",
        lg: "h-12 px-6",
        sm: "h-9 px-3"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);

Button.displayName = "Button";

export { Button, buttonVariants };
