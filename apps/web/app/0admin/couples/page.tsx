"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { AdminFrame } from "@/components/admin/admin-frame";
import { adminFetch, buildAdminQuery, formatNumber } from "@/components/admin/client";
import type { AdminCoupleListItem, AdminPaginated } from "@/components/admin/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TextField } from "@/components/ui/text-field";

export default function AdminCouplesPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<AdminPaginated<AdminCoupleListItem> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const query = useMemo(() => buildAdminQuery({ search, page, pageSize: 20 }), [page, search]);

  useEffect(() => {
    setError(null);
    void adminFetch<AdminPaginated<AdminCoupleListItem>>(`/0admin/couples${query}`)
      .then(setData)
      .catch((reason) => {
        if (reason instanceof Error && reason.message !== "UNAUTHORIZED") {
          setError(reason.message);
        }
      });
  }, [query]);

  return (
    <AdminFrame title="Couples" description="Workspace lookup with membership, invite, and shared activity context.">
      <Card className="panel-soft mb-6">
        <CardHeader><CardTitle>Search</CardTitle></CardHeader>
        <CardContent><TextField value={search} placeholder="Couple name, id, member email" onChange={(event) => { setPage(1); setSearch(event.target.value); }} /></CardContent>
      </Card>
      {error ? <p className="status-error mb-4 text-sm">{error}</p> : null}
      <Card className="panel-soft">
        <CardHeader><CardTitle>Couple list</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {data?.items.map((item) => (
            <Link key={item.id} href={`/0admin/couples/${item.id}`} className="block rounded-2xl border border-[rgba(201,168,76,0.16)] px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="body-muted text-xs">{item.members.map((member) => member.user.email ?? member.user.username ?? member.user.firstName ?? member.user.id).join(", ")}</p>
                </div>
                <div className="text-right text-xs">
                  <p>{formatNumber(item.counts.transactions)} tx</p>
                  <p>{formatNumber(item.openInviteCount)} open invites</p>
                </div>
              </div>
            </Link>
          )) ?? <p className="body-muted text-sm">Loading couples...</p>}
        </CardContent>
      </Card>
    </AdminFrame>
  );
}
