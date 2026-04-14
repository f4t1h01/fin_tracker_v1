"use client";

import { type LucideIcon } from "lucide-react";
import { usePathname } from "next/navigation";

import { AppLink } from "@/components/navigation/app-link";
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
        "min-h-11 w-fit shrink-0 self-start rounded-full px-4 py-2.5 text-left text-[12px] font-semibold uppercase tracking-[0.12em] leading-none transition-[transform,background-color,border-color,color,box-shadow]",
        active
          ? "border-[var(--gold)] bg-[color-mix(in_srgb,var(--gold)_12%,transparent)] text-[var(--ink)] shadow-[0_10px_24px_rgba(201,168,76,0.12)] hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(201,168,76,0.16)]"
          : "border-[rgba(201,168,76,0.18)] bg-transparent text-[var(--ink-soft)] hover:-translate-y-0.5 hover:border-[var(--gold)] hover:text-[var(--ink)] hover:shadow-[0_12px_28px_rgba(201,168,76,0.12)]"
      )}
    >
      <AppLink
        href={href}
        aria-current={active ? "page" : undefined}
        className="inline-flex w-fit shrink-0 items-center justify-center gap-2.5 whitespace-nowrap text-left leading-none"
      >
        <Icon className={cn("size-4 shrink-0", active ? "text-[var(--gold)]" : "text-[var(--ink-soft)]")} />
        <span className="block leading-none">{label}</span>
      </AppLink>
    </Button>
  );
}

export function WorkspaceHeaderActions({ groups, className }: WorkspaceHeaderActionsProps) {
  const pathname = usePathname();

  return (
    <div className={cn("w-full space-y-3", className)}>
      {groups.map((group) => (
        <div key={group.label} className="space-y-2">
          <p className="field-label text-[11px] font-semibold uppercase tracking-[0.18em]">{group.label}</p>
          <div className="w-full py-1">
            <div className="w-full overflow-x-auto py-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden md:overflow-visible">
              <div className="inline-flex w-max flex-nowrap items-center justify-start gap-2.5 px-1">
                {group.items.map((item) => {
                  const active = isWorkspaceRouteActive(pathname, item.href);

                  return <WorkspaceHeaderActionLink key={item.href} href={item.href} label={item.label} icon={item.icon} active={active} />;
                })}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
