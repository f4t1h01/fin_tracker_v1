"use client";

import { useEffect, useState } from "react";

import { AdminFrame } from "@/components/admin/admin-frame";
import { adminFetch } from "@/components/admin/client";
import type { AdminGoodsUomListResponse } from "@/components/admin/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";

const defaultForm = {
  code: "",
  label: "",
  groupKey: "COUNT",
  decimals: "0",
  sortOrder: "0"
};

export default function AdminGoodsUomsPage() {
  const [data, setData] = useState<AdminGoodsUomListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const refresh = async () => {
    try {
      const payload = await adminFetch<AdminGoodsUomListResponse>("/0admin/goods/uoms");
      setData(payload);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load goods UOMs");
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const onCreate = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await adminFetch("/0admin/goods/uoms", {
        method: "POST",
        body: JSON.stringify({
          code: form.code,
          label: form.label,
          groupKey: form.groupKey,
          decimals: Number(form.decimals),
          sortOrder: Number(form.sortOrder)
        })
      });
      setForm(defaultForm);
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not create goods UOM");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onToggleStatus = async (id: string, isActive: boolean) => {
    setIsSubmitting(true);
    setError(null);
    try {
      await adminFetch(`/0admin/goods/uoms/${id}/status`, {
        method: "POST",
        body: JSON.stringify({ isActive: !isActive })
      });
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not update goods UOM status");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminFrame title="Goods UOMs" description="Manage the unit catalog used by My Goods item forms and inventory rows.">
      {error ? <p className="status-error mb-4 text-sm">{error}</p> : null}

      <Card className="panel-soft mb-6">
        <CardHeader><CardTitle>Add unit</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-5">
          <TextField value={form.code} onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))} placeholder="kg" />
          <TextField value={form.label} onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))} placeholder="Kilogram" />
          <SelectField value={form.groupKey} onChange={(event) => setForm((current) => ({ ...current, groupKey: event.target.value }))}>
            <option value="COUNT">Count</option>
            <option value="MASS">Mass</option>
            <option value="VOLUME">Volume</option>
            <option value="OTHER">Other</option>
          </SelectField>
          <TextField value={form.decimals} onChange={(event) => setForm((current) => ({ ...current, decimals: event.target.value }))} placeholder="Decimals" />
          <div className="flex gap-2">
            <TextField value={form.sortOrder} onChange={(event) => setForm((current) => ({ ...current, sortOrder: event.target.value }))} placeholder="Sort" />
            <Button type="button" disabled={isSubmitting} onClick={() => void onCreate()}>
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="panel-soft">
        <CardHeader><CardTitle>Units</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {data?.items.map((item) => (
            <div key={item.id} className="rounded-2xl border border-[rgba(201,168,76,0.16)] px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{item.code} • {item.label}</p>
                  <p className="body-muted text-xs">{item.groupKey} • decimals {item.decimals} • sort {item.sortOrder}</p>
                </div>
                <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => void onToggleStatus(item.id, item.isActive)}>
                  {item.isActive ? "Disable" : "Enable"}
                </Button>
              </div>
            </div>
          )) ?? <p className="body-muted">Loading units...</p>}
        </CardContent>
      </Card>
    </AdminFrame>
  );
}
