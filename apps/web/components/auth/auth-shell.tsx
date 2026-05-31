"use client";

import type { ReactNode } from "react";

import { AppLink } from "@/components/navigation/app-link";
import { BrandMark } from "@/components/marketing/brand-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type AuthShellProps = {
  eyebrow: string;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthShell({ eyebrow, title, description, children, footer }: AuthShellProps) {
  return (
    <main className="auth-page-shell container-shell pb-16 pt-24">
      <header className="soft-rise mb-8 flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-4">
          <BrandMark href="/" />
          <div>
            <p className="eyebrow-row">{eyebrow}</p>
            <h1 className="mt-5 font-[family-name:var(--font-heading)] text-[clamp(36px,4vw,52px)] font-light leading-[1.08]">{title}</h1>
          </div>
        </div>
        <ThemeToggle />
      </header>

      <Card className="auth-panel panel-soft mx-auto w-full max-w-[520px]">
        {description ? (
          <CardHeader>
            <CardTitle>Duet access</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
        ) : null}
        <CardContent className={description ? "space-y-4" : "space-y-4 pt-5"}>{children}</CardContent>
      </Card>

      <div className="mt-6 flex justify-center">
        {footer ?? (
          <AppLink className="secondary-link" href="/">
            Back to overview
          </AppLink>
        )}
      </div>
    </main>
  );
}
