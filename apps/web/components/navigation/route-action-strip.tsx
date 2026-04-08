import type { ReactNode } from "react";

import { AppLink } from "@/components/navigation/app-link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

type RouteAction = {
  href: string;
  label: string;
  variant?: "default" | "outline";
};

type RouteActionStripProps = {
  actions: readonly RouteAction[];
  children?: ReactNode;
  className?: string;
};

export function RouteActionStrip({ actions, children, className }: RouteActionStripProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2 sm:justify-end", className)}>
      {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
      {actions.map((action) => (
        <Button
          key={action.href}
          asChild
          variant={action.variant ?? "outline"}
          className="min-h-12 rounded-full px-5 py-3 text-[12px] font-semibold uppercase tracking-[0.14em] sm:text-[13px]"
        >
          <AppLink href={action.href}>{action.label}</AppLink>
        </Button>
      ))}
    </div>
  );
}
