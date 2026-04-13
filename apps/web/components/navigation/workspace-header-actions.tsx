"use client";

import { type LucideIcon } from "lucide-react";
import { usePathname } from "next/navigation";

import { AppLink } from "@/components/navigation/app-link";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

import { isWorkspaceRouteActive, type WorkspaceNavigationGroup } from "./workspace-navigation";

type WorkspaceHeaderActionsProps = {
  groups: readonly WorkspaceNavigationGroup[];
  className?: string;
};

type WorkspaceHeaderActionLinkProps = {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
};

function WorkspaceHeaderActionLink({ href, label, icon: Icon, active }: WorkspaceHeaderActionLinkProps) {
  return (
    <Button
      asChild
      variant="outline"
      className={cn(
        "h-10 rounded-full px-4 py-0 text-[12px] font-semibold uppercase tracking-[0.12em]",
        active
          ? "border-[var(--gold)] bg-[color-mix(in_srgb,var(--gold)_12%,transparent)] text-[var(--ink)] shadow-[0_10px_24px_rgba(201,168,76,0.12)]"
          : "border-[rgba(201,168,76,0.18)] bg-transparent text-[var(--ink-soft)] hover:-translate-y-0.5 hover:border-[var(--gold)] hover:text-[var(--ink)]"
      )}
    >
      <AppLink href={href} aria-current={active ? "page" : undefined} className="min-w-0">
        <Icon className={cn("size-4 shrink-0", active ? "text-[var(--gold)]" : "text-[var(--ink-soft)]")} />
        <span className="truncate">{label}</span>
      </AppLink>
    </Button>
  );
}

export function WorkspaceHeaderActions({ groups, className }: WorkspaceHeaderActionsProps) {
  const pathname = usePathname();

  return (
    <div className={cn("flex flex-wrap gap-x-5 gap-y-4", className)}>
      {groups.map((group) => (
        <div key={group.label} className="space-y-2">
          <p className="field-label text-[11px] font-semibold uppercase tracking-[0.18em]">{group.label}</p>
          <div className="flex flex-wrap gap-2">
            {group.items.map((item) => {
              const active = isWorkspaceRouteActive(pathname, item.href);

              return <WorkspaceHeaderActionLink key={item.href} href={item.href} label={item.label} icon={item.icon} active={active} />;
            })}
          </div>
        </div>
      ))}

      <div className="space-y-2">
        <p className="field-label text-[11px] font-semibold uppercase tracking-[0.18em]">Theme</p>
        <div className="inline-flex items-center rounded-full border border-[rgba(201,168,76,0.18)] bg-[color-mix(in_srgb,var(--warm-white)_82%,transparent)] px-3 py-1.5 shadow-[0_8px_22px_rgba(26,20,16,0.05)]">
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}
