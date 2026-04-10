"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { AdminFrame } from "@/components/admin/admin-frame";
import { adminFetch, buildAdminQuery } from "@/components/admin/client";
import type { AdminPaginated, AdminTransactionListItem } from "@/components/admin/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";

export default function AdminTransactionsPage() {
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<AdminPaginated<AdminTransactionListItem> | null>(null);
  const query = useMemo(() => buildAdminQuery({ search, kind, from, to, page, pageSize: 20 }), [from, kind, page, search, to]);

  useEffect(() => {
    void adminFetch<AdminPaginated<AdminTransactionListItem>>(`/0admin/transactions${query}`).then(setData).catch(() => null);
  }, [query]);

  return (
    <AdminFrame title="Transactions" description="Search the ledger by text, kind, and date range before opening a transaction for correction.">
      <Card className="panel-soft mb-6">
        <CardHeader><CardTitle>Filters</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <TextField value={search} placeholder="Note, id, user, category" onChange={(event) => { setPage(1); setSearch(event.target.value); }} />
          <SelectField value={kind} onChange={(event) => { setPage(1); setKind(event.target.value); }}><option value="">All kinds</option><option value="EXPENSE">Expense</option><option value="INCOME">Income</option></SelectField>
          <TextField type="date" value={from} onChange={(event) => { setPage(1); setFrom(event.target.value); }} />
          <TextField type="date" value={to} onChange={(event) => { setPage(1); setTo(event.target.value); }} />
        </CardContent>
      </Card>
      <Card className="panel-soft">
        <CardHeader><CardTitle>Ledger</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {data?.items.map((item) => (
            <Link key={item.id} href={`/0admin/transactions/${item.id}`} className="block rounded-2xl border border-[rgba(201,168,76,0.16)] px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{item.category.name}</p>
                  <p className="body-muted text-xs">{item.user.email ?? item.user.username ?? item.user.firstName ?? "Unknown"} • {item.couple.name}</p>
                </div>
                <div className="text-right text-sm">
                  <p>{item.currency} {item.amount}</p>
                  <p className="body-muted text-xs">{new Date(item.happenedAt).toLocaleString("en-US")}</p>
                </div>
              </div>
            </Link>
          )) ?? <p className="body-muted">Loading transactions...</p>}
        </CardContent>
      </Card>
    </AdminFrame>
  );
}
