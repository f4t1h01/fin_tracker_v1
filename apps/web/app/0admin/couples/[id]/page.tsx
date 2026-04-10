"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { AdminFrame } from "@/components/admin/admin-frame";
import { adminFetch, formatUsdMicros } from "@/components/admin/client";
import type { AdminCoupleDetailResponse } from "@/components/admin/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TextField } from "@/components/ui/text-field";

export default function AdminCoupleDetailPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<AdminCoupleDetailResponse | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    if (!params.id) {
      return;
    }

    void adminFetch<AdminCoupleDetailResponse>(`/0admin/couples/${params.id}`)
      .then(setData)
      .catch((cause) => {
        if (cause instanceof Error && cause.message !== "UNAUTHORIZED") {
          setError(cause.message);
        }
      });
  };

  useEffect(() => {
    load();
  }, [params.id]);

  const invalidateInvite = async (inviteId: string) => {
    if (!reason.trim()) {
      setError("Reason is required to invalidate an invite.");
      return;
    }

    await adminFetch(`/0admin/couples/${params.id}/invites/${inviteId}/invalidate`, {
      method: "POST",
      body: JSON.stringify({ reason })
    });
    setReason("");
    load();
  };

  return (
    <AdminFrame title="Couple detail" description="Member list, binds, invite controls, and recent shared activity.">
      {error ? <p className="status-error mb-4 text-sm">{error}</p> : null}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="panel-soft">
          <CardHeader><CardTitle>Workspace</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><span className="body-muted">Name:</span> {data?.couple.name ?? "-"}</p>
            <p><span className="body-muted">Members:</span> {data?.couple.members.length ?? 0}</p>
            <p><span className="body-muted">Binds:</span> {data?.couple.binds.length ?? 0}</p>
          </CardContent>
        </Card>

        <Card className="panel-soft">
          <CardHeader><CardTitle>Category summary</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {data?.categorySummary.map((item) => (
              <div key={`${item.scope}-${item.kind}`} className="flex items-center justify-between gap-3">
                <span>{item.scope} {item.kind}</span>
                <span>{item.count}</span>
              </div>
            )) ?? <p className="body-muted">Loading summary...</p>}
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="panel-soft">
          <CardHeader><CardTitle>Open invites</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <label className="space-y-1 text-sm">
              <span className="field-label">Reason for invalidation</span>
              <TextField value={reason} onChange={(event) => setReason(event.target.value)} />
            </label>
            {data?.couple.invites.map((invite) => (
              <div key={invite.id} className="rounded-xl border border-[rgba(201,168,76,0.16)] px-3 py-2">
                <div className="font-mono text-xs">{invite.code}</div>
                <div className="body-muted text-xs">Expires {new Date(invite.expiresAt).toLocaleString("en-US")}</div>
                {!invite.consumedAt ? <Button type="button" variant="outline" className="mt-2" onClick={() => invalidateInvite(invite.id)}>Invalidate</Button> : null}
              </div>
            )) ?? <p className="body-muted">Loading invites...</p>}
          </CardContent>
        </Card>

        <Card className="panel-soft">
          <CardHeader><CardTitle>Recent AI usage</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {data?.recentAiUsage.map((item) => (
              <div key={item.id} className="rounded-xl border border-[rgba(201,168,76,0.16)] px-3 py-2">
                <div className="flex items-center justify-between gap-3">
                  <span>{item.model}</span>
                  <span>{formatUsdMicros(item.totalCostMicros)}</span>
                </div>
                <div className="body-muted text-xs">{item.operation} • {item.status}</div>
              </div>
            )) ?? <p className="body-muted">Loading AI usage...</p>}
          </CardContent>
        </Card>
      </div>
    </AdminFrame>
  );
}
