"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";

import { BrandMark } from "@/components/marketing/brand-mark";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/cn";

import { adminFetch } from "./client";
import type { AdminSession } from "./types";

const navItems = [
  { href: "/0admin", label: "Overview" },
  { href: "/0admin/users", label: "Users" },
  { href: "/0admin/couples", label: "Couples" },
  { href: "/0admin/transactions", label: "Transactions" },
  { href: "/0admin/categories", label: "Categories" },
  { href: "/0admin/goods/uoms", label: "Goods UOMs" },
  { href: "/0admin/ai-demo", label: "AI demo" },
  { href: "/0admin/ai-usage", label: "AI usage" },
  { href: "/0admin/ai-pricing", label: "AI pricing" },
  { href: "/0admin/sql", label: "SQL" },
  { href: "/0admin/security", label: "Security" },
  { href: "/0admin/audit", label: "Audit" }
];

type AdminFrameProps = {
  title: string;
  description: string;
  actions?: ReactNode;
  children: ReactNode;
};

export function AdminFrame({ title, description, actions, children }: AdminFrameProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [admin, setAdmin] = useState<AdminSession | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);

  useEffect(() => {
    void adminFetch<AdminSession>("/0admin/me")
      .then((payload) => {
        setAdmin(payload);
      })
      .catch((error) => {
        if (error instanceof Error && error.message === "UNAUTHORIZED") {
          router.replace("/0admin/login");
          return;
        }
      })
      .finally(() => {
        setLoadingSession(false);
      });
  }, [router]);

  const onSignOut = async () => {
    await adminFetch("/0admin/logout", {
      method: "POST",
      body: JSON.stringify({})
    }).catch(() => null);
    router.replace("/0admin/login");
  };

  return (
    <main className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
      <div className="soft-rise mb-6 space-y-4">
        <BrandMark href="/" />
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="eyebrow-row">Operations</p>
            <h1 className="font-[family-name:var(--font-heading)] text-3xl">{title}</h1>
            <p className="body-muted text-sm">{description}</p>
            <p className="body-muted text-xs">Signed in as {admin?.email ?? "..."}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {actions}
            <Button type="button" variant="outline" onClick={onSignOut}>
              Sign out
            </Button>
          </div>
        </div>
      </div>

      <Card className="panel-soft mb-6">
        <CardContent className="flex flex-wrap gap-2 pt-6">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-full border px-4 py-2 text-sm transition-colors",
                pathname === item.href
                  ? "border-[var(--gold)] bg-[color-mix(in_srgb,var(--gold)_14%,transparent)] text-[var(--ink)]"
                  : "border-[rgba(201,168,76,0.18)] text-[var(--ink-soft)] hover:border-[var(--gold)] hover:text-[var(--ink)]"
              )}
            >
              {item.label}
            </Link>
          ))}
        </CardContent>
      </Card>

      {loadingSession ? <p className="body-muted mb-4 text-sm">Checking admin session...</p> : null}
      {children}
    </main>
  );
}
