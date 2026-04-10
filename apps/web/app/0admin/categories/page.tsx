"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { AdminFrame } from "@/components/admin/admin-frame";
import { adminFetch, buildAdminQuery } from "@/components/admin/client";
import type { AdminCategoryListItem, AdminPaginated } from "@/components/admin/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";

export default function AdminCategoriesPage() {
  const [search, setSearch] = useState("");
  const [scope, setScope] = useState("");
  const [kind, setKind] = useState("");
  const [data, setData] = useState<AdminPaginated<AdminCategoryListItem> | null>(null);
  const query = useMemo(() => buildAdminQuery({ search, scope, kind, pageSize: 50 }), [kind, scope, search]);

  useEffect(() => {
    void adminFetch<AdminPaginated<AdminCategoryListItem>>(`/0admin/categories${query}`).then(setData).catch(() => null);
  }, [query]);

  return (
    <AdminFrame title="Categories" description="Review category ownership, scope, visibility, and tree structure before applying repairs.">
      <Card className="panel-soft mb-6">
        <CardHeader><CardTitle>Filters</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <TextField value={search} placeholder="Name or workspace" onChange={(event) => setSearch(event.target.value)} />
          <SelectField value={kind} onChange={(event) => setKind(event.target.value)}><option value="">All kinds</option><option value="EXPENSE">Expense</option><option value="INCOME">Income</option></SelectField>
          <SelectField value={scope} onChange={(event) => setScope(event.target.value)}><option value="">All scopes</option><option value="PERSONAL">Personal</option><option value="SHARED">Shared</option></SelectField>
        </CardContent>
      </Card>
      <Card className="panel-soft">
        <CardHeader><CardTitle>Categories</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {data?.items.map((item) => (
            <Link key={item.id} href={`/0admin/categories/${item.id}`} className="block rounded-2xl border border-[rgba(201,168,76,0.16)] px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="body-muted text-xs">{item.couple.name} • {item.scope} • {item.kind}</p>
                </div>
                <div className="text-right text-xs">
                  <p>{item.transactionCount} tx</p>
                  <p>{item.childCount} children</p>
                </div>
              </div>
            </Link>
          )) ?? <p className="body-muted">Loading categories...</p>}
        </CardContent>
      </Card>
    </AdminFrame>
  );
}
