"use client";

import { useEffect, useMemo, useState } from "react";

import { AdminFrame } from "@/components/admin/admin-frame";
import { adminFetch, buildAdminQuery, formatUsdMicros } from "@/components/admin/client";
import type { AdminAiPricingListResponse } from "@/components/admin/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";

const KNOWN_MODELS = ["gpt-4o-mini", "gpt-4o-transcribe"];

export default function AdminAiPricingPage() {
  const [data, setData] = useState<AdminAiPricingListResponse | null>(null);
  const [status, setStatus] = useState("");
  const [modelFilter, setModelFilter] = useState("");
  const [page, setPage] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [model, setModel] = useState(KNOWN_MODELS[0]);
  const [textInputMicrosPer1m, setTextInputMicrosPer1m] = useState("");
  const [audioInputMicrosPer1m, setAudioInputMicrosPer1m] = useState("");
  const [textOutputMicrosPer1m, setTextOutputMicrosPer1m] = useState("");
  const [audioOutputMicrosPer1m, setAudioOutputMicrosPer1m] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [notes, setNotes] = useState("");

  const query = useMemo(
    () =>
      buildAdminQuery({
        model: modelFilter,
        status,
        page,
        pageSize: 20
      }),
    [modelFilter, page, status]
  );

  const refresh = async () => {
    const payload = await adminFetch<AdminAiPricingListResponse>(`/0admin/ai-pricing${query}`);
    setData(payload);
  };

  useEffect(() => {
    setErrorMessage(null);
    void refresh().catch((error) => {
      if (error instanceof Error && error.message !== "UNAUTHORIZED") {
        setErrorMessage(error.message);
      }
    });
  }, [query]);

  const onSubmit = async () => {
    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await adminFetch("/0admin/ai-pricing", {
        method: "POST",
        body: JSON.stringify({
          model,
          textInputMicrosPer1m: textInputMicrosPer1m ? Number(textInputMicrosPer1m) : undefined,
          audioInputMicrosPer1m: audioInputMicrosPer1m ? Number(audioInputMicrosPer1m) : undefined,
          textOutputMicrosPer1m: textOutputMicrosPer1m ? Number(textOutputMicrosPer1m) : undefined,
          audioOutputMicrosPer1m: audioOutputMicrosPer1m ? Number(audioOutputMicrosPer1m) : undefined,
          effectiveFrom: effectiveFrom ? new Date(effectiveFrom).toISOString() : undefined,
          notes: notes || undefined
        })
      });

      setSuccessMessage(`Current pricing updated for ${model}.`);
      setTextInputMicrosPer1m("");
      setAudioInputMicrosPer1m("");
      setTextOutputMicrosPer1m("");
      setAudioOutputMicrosPer1m("");
      setEffectiveFrom("");
      setNotes("");
      await refresh();
    } catch (error) {
      if (error instanceof Error && error.message !== "UNAUTHORIZED") {
        setErrorMessage(error.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const onRetire = async (id: string) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await adminFetch(`/0admin/ai-pricing/${id}/retire`, {
        method: "POST",
        body: JSON.stringify({})
      });
      setSuccessMessage("Pricing record retired.");
      await refresh();
    } catch (error) {
      if (error instanceof Error && error.message !== "UNAUTHORIZED") {
        setErrorMessage(error.message);
      }
    }
  };

  return (
    <AdminFrame
      title="AI pricing"
      description="Database-managed pricing history used for future AI spend calculations. New entries replace the active pricing for the same model and keep a full history."
    >
      <Card className="panel-soft mb-6">
        <CardHeader><CardTitle>Set current pricing</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className="space-y-1 text-sm">
            <span className="field-label">Model</span>
            <SelectField value={model} onChange={(event) => setModel(event.target.value)}>
              {KNOWN_MODELS.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </SelectField>
          </label>
          <label className="space-y-1 text-sm">
            <span className="field-label">Text input micros / 1M</span>
            <TextField type="number" min="0" value={textInputMicrosPer1m} onChange={(event) => setTextInputMicrosPer1m(event.target.value)} />
          </label>
          <label className="space-y-1 text-sm">
            <span className="field-label">Audio input micros / 1M</span>
            <TextField type="number" min="0" value={audioInputMicrosPer1m} onChange={(event) => setAudioInputMicrosPer1m(event.target.value)} />
          </label>
          <label className="space-y-1 text-sm">
            <span className="field-label">Text output micros / 1M</span>
            <TextField type="number" min="0" value={textOutputMicrosPer1m} onChange={(event) => setTextOutputMicrosPer1m(event.target.value)} />
          </label>
          <label className="space-y-1 text-sm">
            <span className="field-label">Audio output micros / 1M</span>
            <TextField type="number" min="0" value={audioOutputMicrosPer1m} onChange={(event) => setAudioOutputMicrosPer1m(event.target.value)} />
          </label>
          <label className="space-y-1 text-sm">
            <span className="field-label">Effective from</span>
            <TextField type="datetime-local" value={effectiveFrom} onChange={(event) => setEffectiveFrom(event.target.value)} />
          </label>
          <label className="space-y-1 text-sm md:col-span-2 xl:col-span-3">
            <span className="field-label">Notes</span>
            <TextField value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional note for why this pricing changed" />
          </label>
          <div className="md:col-span-2 xl:col-span-3 flex flex-wrap items-center gap-3">
            <Button type="button" onClick={onSubmit} disabled={submitting}>
              {submitting ? "Saving..." : "Save pricing"}
            </Button>
            {successMessage ? <p className="text-sm text-emerald-700">{successMessage}</p> : null}
            {errorMessage ? <p className="status-error text-sm">{errorMessage}</p> : null}
          </div>
        </CardContent>
      </Card>

      <Card className="panel-soft mb-6">
        <CardHeader><CardTitle>Current pricing</CardTitle></CardHeader>
        <CardContent className="grid gap-3 lg:grid-cols-2">
          {data?.currentByModel.length ? data.currentByModel.map((item) => (
            <div key={item.id} className="detail-box space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{item.model}</p>
                  <p className="body-muted text-xs">
                    Active from {new Date(item.effectiveFrom).toLocaleString("en-US")}
                  </p>
                </div>
                <Button type="button" variant="outline" onClick={() => void onRetire(item.id)}>
                  Retire
                </Button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-xl border px-3 py-2 text-sm">
                  <div className="body-muted text-xs">Text input</div>
                  <div className="font-medium">{formatUsdMicros(item.textInputMicrosPer1m)}</div>
                </div>
                <div className="rounded-xl border px-3 py-2 text-sm">
                  <div className="body-muted text-xs">Audio input</div>
                  <div className="font-medium">{formatUsdMicros(item.audioInputMicrosPer1m)}</div>
                </div>
                <div className="rounded-xl border px-3 py-2 text-sm">
                  <div className="body-muted text-xs">Text output</div>
                  <div className="font-medium">{formatUsdMicros(item.textOutputMicrosPer1m)}</div>
                </div>
                <div className="rounded-xl border px-3 py-2 text-sm">
                  <div className="body-muted text-xs">Audio output</div>
                  <div className="font-medium">{formatUsdMicros(item.audioOutputMicrosPer1m)}</div>
                </div>
              </div>
              {item.notes ? <p className="body-muted text-xs">{item.notes}</p> : null}
            </div>
          )) : <p className="body-muted text-sm">No active pricing is configured yet.</p>}
        </CardContent>
      </Card>

      <Card className="panel-soft">
        <CardHeader><CardTitle>Pricing history</CardTitle></CardHeader>
        <CardContent>
          <div className="mb-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <label className="space-y-1 text-sm">
              <span className="field-label">Model</span>
              <TextField value={modelFilter} onChange={(event) => { setPage(1); setModelFilter(event.target.value); }} />
            </label>
            <label className="space-y-1 text-sm">
              <span className="field-label">Status</span>
              <SelectField value={status} onChange={(event) => { setPage(1); setStatus(event.target.value); }}>
                <option value="">All statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="RETIRED">Retired</option>
              </SelectField>
            </label>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-2 text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-[0.16em] text-[var(--ink-soft)]">
                  <th className="px-3 py-2">Model</th>
                  <th className="px-3 py-2">Text input</th>
                  <th className="px-3 py-2">Audio input</th>
                  <th className="px-3 py-2">Text output</th>
                  <th className="px-3 py-2">Audio output</th>
                  <th className="px-3 py-2">Effective</th>
                  <th className="px-3 py-2">Retired</th>
                  <th className="px-3 py-2">Meta</th>
                </tr>
              </thead>
              <tbody>
                {data?.items.map((item) => (
                  <tr key={item.id} className="rounded-xl bg-[color-mix(in_srgb,var(--warm-white)_78%,transparent)]">
                    <td className="rounded-l-xl px-3 py-3 align-top font-medium">{item.model}</td>
                    <td className="px-3 py-3 align-top">{formatUsdMicros(item.textInputMicrosPer1m)}</td>
                    <td className="px-3 py-3 align-top">{formatUsdMicros(item.audioInputMicrosPer1m)}</td>
                    <td className="px-3 py-3 align-top">{formatUsdMicros(item.textOutputMicrosPer1m)}</td>
                    <td className="px-3 py-3 align-top">{formatUsdMicros(item.audioOutputMicrosPer1m)}</td>
                    <td className="px-3 py-3 align-top">{new Date(item.effectiveFrom).toLocaleString("en-US")}</td>
                    <td className="px-3 py-3 align-top">{item.retiredAt ? new Date(item.retiredAt).toLocaleString("en-US") : "Active"}</td>
                    <td className="rounded-r-xl px-3 py-3 align-top">
                      <div className="body-muted text-xs">{item.createdByAdminEmail ?? "Unknown admin"}</div>
                      <div className="body-muted text-xs">Created {new Date(item.createdAt).toLocaleString("en-US")}</div>
                      {item.notes ? <div className="mt-1 text-xs">{item.notes}</div> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="body-muted text-sm">Page {data?.page ?? 1} of {data?.totalPages ?? 1}. {data?.totalItems ?? 0} rows total.</p>
            <div className="flex gap-3">
              <button className="rounded-full border px-4 py-2 text-sm" disabled={!data || data.page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</button>
              <button className="rounded-full border px-4 py-2 text-sm" disabled={!data || data.page >= data.totalPages} onClick={() => setPage((current) => current + 1)}>Next</button>
            </div>
          </div>
        </CardContent>
      </Card>
    </AdminFrame>
  );
}
