"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { AdminFrame } from "@/components/admin/admin-frame";
import { adminFetch, buildAdminQuery, formatNumber } from "@/components/admin/client";
import type { AdminPaginated, AdminUserListItem } from "@/components/admin/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TextField } from "@/components/ui/text-field";

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<AdminPaginated<AdminUserListItem> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const query = useMemo(() => buildAdminQuery({ search, page, pageSize: 20 }), [page, search]);

  useEffect(() => {
    setError(null);
    void adminFetch<AdminPaginated<AdminUserListItem>>(`/0admin/users${query}`)
      .then(setData)
      .catch((reason) => {
        if (reason instanceof Error && reason.message !== "UNAUTHORIZED") {
          setError(reason.message);
        }
      });
  }, [query]);

  return (
    <AdminFrame title="Users" description="Read-only user lookup with couple binding state, membership context, and AI usage counts.">
      <Card className="panel-soft mb-6">
        <CardHeader><CardTitle>Search</CardTitle></CardHeader>
        <CardContent><TextField value={search} placeholder="Email, username, first name, couple code" onChange={(event) => { setPage(1); setSearch(event.target.value); }} /></CardContent>
      </Card>

      {error ? <p className="status-error mb-4 text-sm">{error}</p> : null}

      <Card className="panel-soft">
        <CardHeader><CardTitle>User list</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {data?.items.map((item) => (
            <Link key={item.id} href={`/0admin/users/${item.id}`} className="block rounded-2xl border border-[rgba(201,168,76,0.16)] px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{item.email ?? item.username ?? item.firstName ?? item.id}</p>
                  <p className="body-muted text-xs">{item.firstName ?? ""} {item.lastName ?? ""} {item.coupleCode ? `• code ${item.coupleCode}` : ""}</p>
                </div>
                <div className="text-right text-xs">
                  <p>{formatNumber(item.counts.transactions)} tx</p>
                  <p>{formatNumber(item.counts.aiUsage)} AI rows</p>
                </div>
              </div>
              <div className="body-muted mt-2 text-xs">{item.bind?.couple.name ?? "No active bind"} • {item.memberships.map((membership) => membership.couple.name).join(", ") || "No memberships"}</div>
            </Link>
          )) ?? <p className="body-muted text-sm">Loading users...</p>}

          <div className="flex items-center justify-between pt-2 text-sm">
            <span className="body-muted">Page {data?.page ?? 1} of {data?.totalPages ?? 1}</span>
            <div className="flex gap-3">
              <button className="rounded-full border px-4 py-2" disabled={!data || data.page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</button>
              <button className="rounded-full border px-4 py-2" disabled={!data || data.page >= data.totalPages} onClick={() => setPage((current) => current + 1)}>Next</button>
            </div>
          </div>
        </CardContent>
      </Card>
    </AdminFrame>
  );
}
