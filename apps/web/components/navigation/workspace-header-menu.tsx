"use client";

import { useEffect, useRef, useState } from "react";

import { ArrowLeftRight, BarChart3, LayoutDashboard, Menu, Tags, UserCog, X, type LucideIcon } from "lucide-react";
import { usePathname } from "next/navigation";

import { AppLink } from "@/components/navigation/app-link";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { useDismissableLayer } from "@/components/ui/use-dismissable-layer";
import { cn } from "@/lib/cn";
import type { ThemeMode } from "@/lib/theme";

type WorkspaceHeaderMenuProps = {
  onThemeChange?: (theme: ThemeMode) => void;
  className?: string;
};

type WorkspaceMenuItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const workspaceMenuItems: readonly WorkspaceMenuItem[] = [
  { href: "/profile/me/manage", label: "Profile management", icon: UserCog },
  { href: "/profile/me/categories", label: "Categories", icon: Tags },
  { href: "/profile/me", label: "Transactions", icon: ArrowLeftRight },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/trends", label: "Trends", icon: BarChart3 }
];

function isActiveRoute(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function WorkspaceHeaderMenu({ onThemeChange, className }: WorkspaceHeaderMenuProps) {
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
    <div ref={menuRef} className={cn("relative shrink-0", className)}>
      <Button
        type="button"
        variant="outline"
        className={cn(
          "size-12 !rounded-[16px] !px-0 !py-0 transition-colors duration-300",
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
          "absolute right-0 top-full z-[40] mt-3 w-[min(24rem,calc(100vw-2rem))] overflow-hidden transition-[max-height,opacity,transform] duration-300 ease-out",
          isOpen ? "pointer-events-auto max-h-[32rem] translate-y-0 opacity-100" : "pointer-events-none max-h-0 -translate-y-2 opacity-0"
        )}
      >
        <div className="panel-soft rounded-[24px] border border-[rgba(201,168,76,0.14)] bg-[color-mix(in_srgb,var(--warm-white)_90%,transparent)] p-3 shadow-[0_24px_56px_rgba(26,20,16,0.14)]">
          <div className="space-y-2">
            {workspaceMenuItems.map((item) => {
              const active = isActiveRoute(pathname, item.href);
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

          <div className="mt-3 rounded-[18px] border border-[rgba(201,168,76,0.12)] bg-[color-mix(in_srgb,var(--warm-white)_82%,transparent)] px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <p className="field-label">Theme</p>
              <ThemeToggle onChange={onThemeChange} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
