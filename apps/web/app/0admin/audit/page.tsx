"use client";

import { useEffect, useMemo, useState } from "react";

import { AdminFrame } from "@/components/admin/admin-frame";
import { adminFetch, buildAdminQuery } from "@/components/admin/client";
import type { AdminAuditListResponse } from "@/components/admin/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";

export default function AdminAuditPage() {
  const [search, setSearch] = useState("");
  const [actionType, setActionType] = useState("");
  const [outcome, setOutcome] = useState("");
  const [data, setData] = useState<AdminAuditListResponse | null>(null);
  const query = useMemo(() => buildAdminQuery({ search, actionType, outcome, pageSize: 50 }), [actionType, outcome, search]);

  useEffect(() => {
    void adminFetch<AdminAuditListResponse>(`/0admin/audit${query}`).then(setData).catch(() => null);
  }, [query]);

  return (
    <AdminFrame title="Audit log" description="Review admin login attempts, SQL execution, and corrective actions with their reason and outcome.">
      <Card className="panel-soft mb-6">
        <CardHeader><CardTitle>Filters</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <TextField value={search} placeholder="Target id or reason" onChange={(event) => setSearch(event.target.value)} />
          <TextField value={actionType} placeholder="Action type" onChange={(event) => setActionType(event.target.value)} />
          <SelectField value={outcome} onChange={(event) => setOutcome(event.target.value)}><option value="">All outcomes</option><option value="SUCCESS">Success</option><option value="ERROR">Error</option></SelectField>
        </CardContent>
      </Card>
      <Card className="panel-soft">
        <CardHeader><CardTitle>Audit entries</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          {data?.items.map((item) => (
            <div key={item.id} className="rounded-2xl border border-[rgba(201,168,76,0.16)] px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{item.actionType}</p>
                  <p className="body-muted text-xs">{item.adminEmail ?? "system"} • {item.targetType ?? "none"} {item.targetId ?? ""}</p>
                </div>
                <div className="text-right text-xs">
                  <p>{item.outcome}</p>
                  <p>{new Date(item.createdAt).toLocaleString("en-US")}</p>
                </div>
              </div>
              {item.reason ? <p className="mt-2 text-xs">{item.reason}</p> : null}
              {item.errorMessage ? <p className="status-error mt-2 text-xs">{item.errorMessage}</p> : null}
            </div>
          )) ?? <p className="body-muted">Loading audit entries...</p>}
        </CardContent>
      </Card>
    </AdminFrame>
  );
}
