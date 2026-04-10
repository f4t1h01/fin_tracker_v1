"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { AdminFrame } from "@/components/admin/admin-frame";
import { adminFetch } from "@/components/admin/client";
import type { AdminCategoryDetailResponse } from "@/components/admin/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";

export default function AdminCategoryDetailPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<AdminCategoryDetailResponse | null>(null);
  const [reason, setReason] = useState("");
  const [scope, setScope] = useState("");
  const [parentCategoryId, setParentCategoryId] = useState("");
  const [ownerUserId, setOwnerUserId] = useState("");
  const [isVisible, setIsVisible] = useState("true");

  const load = () => {
    void adminFetch<AdminCategoryDetailResponse>(`/0admin/categories/${params.id}`)
      .then((payload) => {
        setData(payload);
        setScope(payload.category.scope);
        setParentCategoryId(payload.category.parentCategory?.id ?? "");
        setOwnerUserId(payload.category.ownerUser?.id ?? "");
        setIsVisible(String(payload.category.isVisible));
      })
      .catch(() => null);
  };

  useEffect(() => {
    if (params.id) {
      load();
    }
  }, [params.id]);

  const onSave = async () => {
    await adminFetch(`/0admin/categories/${params.id}/correct`, {
      method: "POST",
      body: JSON.stringify({ reason, scope, parentCategoryId, ownerUserId, isVisible: isVisible === "true" })
    });
    load();
  };

  return (
    <AdminFrame title="Category detail" description="Inspect usage and apply audited repairs to visibility, scope, owner, or parent linkage.">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="panel-soft">
          <CardHeader><CardTitle>Category</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><span className="body-muted">Name:</span> {data?.category.name ?? "-"}</p>
            <p><span className="body-muted">Workspace:</span> {data?.category.couple.name ?? "-"}</p>
            <p><span className="body-muted">Usage:</span> {data?.usage.transactionCount ?? 0} transactions</p>
          </CardContent>
        </Card>
        <Card className="panel-soft">
          <CardHeader><CardTitle>Correction</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <TextField value={reason} placeholder="Reason" onChange={(event) => setReason(event.target.value)} />
            <SelectField value={scope} onChange={(event) => setScope(event.target.value)}><option value="PERSONAL">Personal</option><option value="SHARED">Shared</option></SelectField>
            <SelectField value={isVisible} onChange={(event) => setIsVisible(event.target.value)}><option value="true">Visible</option><option value="false">Hidden</option></SelectField>
            <TextField value={ownerUserId} placeholder="Owner user id (for personal scope)" onChange={(event) => setOwnerUserId(event.target.value)} />
            <SelectField value={parentCategoryId} onChange={(event) => setParentCategoryId(event.target.value)}>
              <option value="">No parent</option>
              {data?.availableParents.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.scope})</option>)}
            </SelectField>
            <Button type="button" onClick={onSave}>Apply correction</Button>
          </CardContent>
        </Card>
      </div>
    </AdminFrame>
  );
}
