"use client";

import { useEffect, useRef, useState } from "react";

import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";

import { AppLink } from "@/components/navigation/app-link";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { useDismissableLayer } from "@/components/ui/use-dismissable-layer";
import { cn } from "@/lib/cn";

import { isWorkspaceRouteActive, workspaceMenuGroups } from "./workspace-navigation";

type WorkspaceHeaderMenuProps = {
  className?: string;
};

export function WorkspaceHeaderMenu({ className }: WorkspaceHeaderMenuProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useDismissableLayer({
    open: isOpen,
    onDismiss: () => setIsOpen(false),
    refs: [menuRef]
  });

  return (
    <div ref={menuRef} className={cn("relative isolate z-[140] shrink-0", className)}>
      <Button
        type="button"
        variant="outline"
        className={cn(
          "relative z-[150] size-12 !rounded-[16px] !px-0 !py-0 transition-colors duration-300",
          isOpen
            ? "border-[var(--gold)] bg-[color-mix(in_srgb,var(--gold)_10%,transparent)] text-[var(--ink)]"
            : "border-[rgba(201,168,76,0.22)] bg-[color-mix(in_srgb,var(--warm-white)_82%,transparent)] text-[var(--ink-soft)]"
        )}
        aria-label={isOpen ? "Close workspace menu" : "Open workspace menu"}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
      >
        {isOpen ? <X className="size-5" /> : <Menu className="size-5" />}
      </Button>

      <div
        className={cn(
          "absolute right-0 top-full z-[145] mt-3 w-[min(22rem,calc(100vw-2rem))] transition-[max-height,opacity,transform] duration-300 ease-out",
          isOpen ? "pointer-events-auto max-h-[32rem] translate-y-0 opacity-100" : "pointer-events-none max-h-0 -translate-y-2 opacity-0"
        )}
      >
        <div className="overflow-hidden rounded-[24px] border border-[rgba(201,168,76,0.14)] bg-[var(--surface-glass)] p-3 shadow-[0_24px_56px_rgba(26,20,16,0.16)] backdrop-blur-[14px] backdrop-saturate-150">
          <div className="space-y-4">
            {workspaceMenuGroups.map((group) => (
              <div key={group.label} className="space-y-2">
                <p className="field-label text-[11px] font-semibold uppercase tracking-[0.18em]">{group.label}</p>
                <div className="space-y-2">
                  {group.items.map((item) => {
                    const active = isWorkspaceRouteActive(pathname, item.href);
                    const Icon = item.icon;

                    return (
                      <AppLink
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsOpen(false)}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "group flex items-center gap-3 rounded-[14px] border px-4 py-3 text-[12px] font-semibold uppercase tracking-[0.14em] transition-all duration-200",
                          active
                            ? "border-[var(--gold)] bg-[color-mix(in_srgb,var(--gold)_12%,transparent)] text-[var(--ink)] shadow-[0_10px_24px_rgba(201,168,76,0.12)]"
                            : "border-[rgba(201,168,76,0.18)] bg-transparent text-[var(--ink-soft)] hover:-translate-y-0.5 hover:border-[var(--gold)] hover:text-[var(--ink)]"
                        )}
                      >
                        <Icon className={cn("size-4 shrink-0", active ? "text-[var(--gold)]" : "text-[var(--ink-soft)] group-hover:text-[var(--ink)]")} />
                        <span className="truncate">{item.label}</span>
                      </AppLink>
                    );
                  })}
                </div>
                {group.label === "Settings" ? (
                  <div className="flex items-center justify-between gap-3 rounded-[14px] border border-[rgba(201,168,76,0.18)] bg-[color-mix(in_srgb,var(--warm-white)_74%,transparent)] px-4 py-3">
                    <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-soft)]">Theme</p>
                    <ThemeToggle onChange={() => setIsOpen(false)} />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
