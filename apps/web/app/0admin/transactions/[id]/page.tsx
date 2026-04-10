"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { AdminFrame } from "@/components/admin/admin-frame";
import { adminFetch } from "@/components/admin/client";
import type { AdminTransactionDetailResponse } from "@/components/admin/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";

export default function AdminTransactionDetailPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<AdminTransactionDetailResponse | null>(null);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [currency, setCurrency] = useState("");
  const [kind, setKind] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [happenedAt, setHappenedAt] = useState("");

  const load = () => {
    void adminFetch<AdminTransactionDetailResponse>(`/0admin/transactions/${params.id}`)
      .then((payload) => {
        setData(payload);
        setNote(payload.transaction.note ?? "");
        setCurrency(payload.transaction.currency);
        setKind(payload.transaction.kind);
        setCategoryId(payload.transaction.category.id);
        setHappenedAt(payload.transaction.happenedAt.slice(0, 16));
      })
      .catch(() => null);
  };

  useEffect(() => {
    if (params.id) {
      load();
    }
  }, [params.id]);

  const onSave = async () => {
    await adminFetch(`/0admin/transactions/${params.id}/correct`, {
      method: "POST",
      body: JSON.stringify({ reason, note, currency, kind, categoryId, happenedAt: new Date(happenedAt).toISOString() })
    });
    load();
  };

  return (
    <AdminFrame title="Transaction detail" description="Inspect normalized values and apply audited corrections to note, kind, currency, date, and category.">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="panel-soft">
          <CardHeader><CardTitle>Current record</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><span className="body-muted">User:</span> {data?.transaction.user.email ?? "-"}</p>
            <p><span className="body-muted">Couple:</span> {data?.transaction.couple.name ?? "-"}</p>
            <p><span className="body-muted">Category:</span> {data?.transaction.category.name ?? "-"}</p>
            <p><span className="body-muted">Exchange rate:</span> {data?.transaction.exchangeRate ?? "-"}</p>
          </CardContent>
        </Card>
        <Card className="panel-soft">
          <CardHeader><CardTitle>Correction</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <TextField value={reason} placeholder="Reason" onChange={(event) => setReason(event.target.value)} />
            <SelectField value={kind} onChange={(event) => setKind(event.target.value)}><option value="EXPENSE">Expense</option><option value="INCOME">Income</option></SelectField>
            <TextField value={currency} onChange={(event) => setCurrency(event.target.value)} />
            <TextField value={note} onChange={(event) => setNote(event.target.value)} />
            <TextField type="datetime-local" value={happenedAt} onChange={(event) => setHappenedAt(event.target.value)} />
            <SelectField value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
              {data?.availableCategories.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.scope})</option>)}
            </SelectField>
            <Button type="button" onClick={onSave}>Apply correction</Button>
          </CardContent>
        </Card>
      </div>
    </AdminFrame>
  );
}
