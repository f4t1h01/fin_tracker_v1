import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "@radix-ui/react-slot";
import * as React from "react";

import { cn } from "@/lib/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap transition-[transform,background-color,border-color,color] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-60",
  {
    variants: {
      variant: {
        default:
          "primary-button [&>span]:relative [&>span]:z-[1]",
        outline:
          "rounded-[2px] border border-[rgba(201,168,76,0.2)] bg-transparent px-5 py-3 text-[13px] uppercase tracking-[0.1em] text-[var(--ink-soft)] hover:-translate-y-0.5 hover:border-[var(--gold)] hover:text-[var(--ink)]",
        ghost:
          "rounded-[2px] px-3 py-2 text-[13px] uppercase tracking-[0.08em] text-[var(--ink-soft)] hover:text-[var(--ink)]",
        link:
          "secondary-link px-0 py-0"
      },
      size: {
        default: "",
        lg: "text-[13px]",
        sm: "px-3 py-2 text-[12px]"
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

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild = false, children, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props}>
      {variant === "default" ? <span>{children}</span> : children}
    </Comp>
  );
});

Button.displayName = "Button";

export { Button, buttonVariants };
