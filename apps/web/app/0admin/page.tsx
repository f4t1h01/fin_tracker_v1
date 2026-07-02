"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { AdminFrame } from "@/components/admin/admin-frame";
import { adminFetch, formatNumber, formatUsdMicros } from "@/components/admin/client";
import type { AdminDashboardResponse } from "@/components/admin/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const moduleGroups = [
  {
    title: "Support",
    description: "Use these first when a real user, workspace, transaction, category, or goods unit needs inspection or repair.",
    items: [
      { href: "/0admin/users", label: "Users", description: "Lookup profiles, couple bindings, defaults, password state, and AI usage." },
      { href: "/0admin/couples", label: "Couples", description: "Inspect memberships, binds, invites, and shared activity." },
      { href: "/0admin/transactions", label: "Transactions", description: "Search the ledger and apply audited corrections." },
      { href: "/0admin/categories", label: "Categories", description: "Review category trees and repair visibility, scope, owner, or parent links." },
      { href: "/0admin/goods/uoms", label: "Goods units", description: "Manage the database-backed unit catalog used by My Goods forms." }
    ]
  },
  {
    title: "Monitoring",
    description: "Track AI cost, errors, pricing history, and admin activity without changing user records.",
    items: [
      { href: "/0admin/ai-usage", label: "AI usage", description: "Review model usage, tokens, spend, errors, and request correlation ids." },
      { href: "/0admin/ai-pricing", label: "AI pricing", description: "Maintain database pricing history used by AI spend calculations." },
      { href: "/0admin/audit", label: "Audit", description: "Review admin login attempts, SQL execution, and corrective actions." }
    ]
  },
  {
    title: "Access",
    description: "Configuration and advanced access tools. These should be touched only for deployment, auth, or support needs.",
    items: [
      { href: "/0admin/auth-settings", label: "Auth settings", description: "Manage email-code and Google login provider settings." },
      { href: "/0admin/security", label: "Security", description: "Manage admin status, password resets, failed logins, and auth audit events." },
      { href: "/0admin/sql", label: "SQL console", description: "Run audited read-only SQL when normal admin pages are not enough." }
    ]
  }
];

export default function AdminOverviewPage() {
  const [data, setData] = useState<AdminDashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void adminFetch<AdminDashboardResponse>("/0admin/dashboard")
      .then(setData)
      .catch((reason) => {
        if (reason instanceof Error && reason.message !== "UNAUTHORIZED") {
          setError(reason.message);
        }
      });
  }, []);

  return (
    <AdminFrame title="Admin workspace" description="Read-only overview, investigation routes, AI spend tracking, and audited corrective tools.">
      {error ? <p className="status-error mb-4 text-sm">{error}</p> : null}

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="panel-soft"><CardHeader><CardTitle>Users</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{data ? formatNumber(data.metrics.users) : "-"}</CardContent></Card>
        <Card className="panel-soft"><CardHeader><CardTitle>Couples</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{data ? formatNumber(data.metrics.couples) : "-"}</CardContent></Card>
        <Card className="panel-soft"><CardHeader><CardTitle>Transactions</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{data ? formatNumber(data.metrics.transactions) : "-"}</CardContent></Card>
        <Card className="panel-soft"><CardHeader><CardTitle>AI spend</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{data ? formatUsdMicros(data.metrics.aiSpendMicros) : "-"}</CardContent></Card>
      </div>

      <div className="mb-6 space-y-6">
        {moduleGroups.map((group) => (
          <section key={group.title} className="space-y-3">
            <div>
              <p className="eyebrow-row">{group.title}</p>
              <p className="body-muted mt-1 text-sm">{group.description}</p>
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              {group.items.map((item) => (
                <Link key={item.href} href={item.href} className="block">
                  <Card className="panel-soft h-full transition-transform hover:-translate-y-0.5">
                    <CardHeader><CardTitle>{item.label}</CardTitle></CardHeader>
                    <CardContent className="body-muted text-sm">{item.description}</CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="panel-soft">
          <CardHeader><CardTitle>Recent transactions</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {data?.recentActivity.transactions.length ? data.recentActivity.transactions.map((item) => (
              <Link key={item.id} href={`/0admin/transactions/${item.id}`} className="block rounded-xl border border-[rgba(201,168,76,0.16)] px-3 py-2">
                <div className="flex items-center justify-between gap-3">
                  <span>{item.category.name}</span>
                  <span>{item.kind}</span>
                </div>
                <div className="body-muted mt-1 text-xs">{item.user.email ?? item.user.username ?? item.user.firstName ?? "Unknown user"}</div>
              </Link>
            )) : <p className="body-muted">No recent transactions.</p>}
          </CardContent>
        </Card>

        <Card className="panel-soft">
          <CardHeader><CardTitle>Recent AI errors</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {data?.recentActivity.aiErrors.length ? data.recentActivity.aiErrors.map((item) => (
              <div key={item.id} className="rounded-xl border border-[rgba(201,168,76,0.16)] px-3 py-2">
                <div className="flex items-center justify-between gap-3">
                  <span>{item.model}</span>
                  <span>{item.operation}</span>
                </div>
                <div className="status-error mt-1 text-xs">{item.errorMessage ?? "Unknown error"}</div>
              </div>
            )) : <p className="body-muted">No recent AI errors.</p>}
          </CardContent>
        </Card>

        <Card className="panel-soft">
          <CardHeader><CardTitle>Recent audit events</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {data?.recentActivity.audit.length ? data.recentActivity.audit.map((item) => (
              <div key={item.id} className="rounded-xl border border-[rgba(201,168,76,0.16)] px-3 py-2">
                <div className="flex items-center justify-between gap-3">
                  <span>{item.actionType}</span>
                  <span>{item.outcome}</span>
                </div>
                <div className="body-muted mt-1 text-xs">{item.adminEmail ?? "system"} {item.targetId ? `-> ${item.targetId}` : ""}</div>
              </div>
            )) : <p className="body-muted">No recent audit events.</p>}
          </CardContent>
        </Card>
      </div>
    </AdminFrame>
  );
}
