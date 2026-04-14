"use client";

import type { ReactNode } from "react";

import { BrandMark } from "@/components/marketing/brand-mark";
import { cn } from "@/lib/cn";

import { WorkspaceHeaderActions } from "./workspace-header-actions";
import { WorkspaceHeaderMenu } from "./workspace-header-menu";
import type { WorkspaceNavigationGroup } from "./workspace-navigation";

type WorkspacePageHeaderProps = {
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: readonly WorkspaceNavigationGroup[];
  className?: string;
};

export function WorkspacePageHeader({ eyebrow, title, description, actions, className }: WorkspacePageHeaderProps) {
  return (
    <header className={cn("soft-rise mb-8 space-y-5", className)}>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
        <div className="min-w-0 space-y-4">
          <BrandMark href="/" />
          <div className="space-y-3">
            <p className="eyebrow-row">{eyebrow}</p>
            <h1 className="font-[family-name:var(--font-heading)] text-[clamp(38px,4vw,56px)] font-light leading-[1.08]">{title}</h1>
          </div>
          {description ? <div className="max-w-4xl space-y-2 text-sm text-[var(--ink-soft)]">{description}</div> : null}
        </div>
        <WorkspaceHeaderMenu className="justify-self-end" />
      </div>
      {actions?.length ? <WorkspaceHeaderActions groups={actions} className="w-full" /> : null}
    </header>
  );
}
