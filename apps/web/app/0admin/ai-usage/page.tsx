"use client";

import { useEffect, useMemo, useState } from "react";

import { AdminFrame } from "@/components/admin/admin-frame";
import { adminFetch, buildAdminQuery, formatNumber, formatUsdMicros } from "@/components/admin/client";
import type { AdminAiUsageListResponse, AdminAiUsageSummaryResponse } from "@/components/admin/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";

export default function AdminAiUsagePage() {
  const [summary, setSummary] = useState<AdminAiUsageSummaryResponse | null>(null);
  const [list, setList] = useState<AdminAiUsageListResponse | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [model, setModel] = useState("");
  const [operation, setOperation] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const query = useMemo(
    () =>
      buildAdminQuery({
        from,
        to,
        model,
        operation,
        status,
        search,
        page,
        pageSize: 20
      }),
    [from, model, operation, page, search, status, to]
  );

  useEffect(() => {
    setErrorMessage(null);
    void Promise.all([
      adminFetch<AdminAiUsageSummaryResponse>(`/0admin/ai-usage/summary${query}`),
      adminFetch<AdminAiUsageListResponse>(`/0admin/ai-usage${query}`)
    ])
      .then(([summaryPayload, listPayload]) => {
        setSummary(summaryPayload);
        setList(listPayload);
      })
      .catch((error) => {
        if (error instanceof Error && error.message !== "UNAUTHORIZED") {
          setErrorMessage(error.message);
        }
      });
  }, [query]);

  return (
    <AdminFrame title="AI expenditure" description="Per-call OpenAI usage, spend, and model breakdown for tracked AI features.">
      <Card className="panel-soft mb-6">
        <CardHeader><CardTitle>Filters</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <label className="space-y-1 text-sm"><span className="field-label">From</span><TextField type="date" value={from} onChange={(event) => { setPage(1); setFrom(event.target.value); }} /></label>
          <label className="space-y-1 text-sm"><span className="field-label">To</span><TextField type="date" value={to} onChange={(event) => { setPage(1); setTo(event.target.value); }} /></label>
          <label className="space-y-1 text-sm"><span className="field-label">Model</span><TextField value={model} onChange={(event) => { setPage(1); setModel(event.target.value); }} /></label>
          <label className="space-y-1 text-sm"><span className="field-label">Operation</span><SelectField value={operation} onChange={(event) => { setPage(1); setOperation(event.target.value); }}><option value="">All operations</option><option value="TRANSCRIPTION">Transcription</option><option value="EXTRACTION">Extraction</option></SelectField></label>
          <label className="space-y-1 text-sm"><span className="field-label">Status</span><SelectField value={status} onChange={(event) => { setPage(1); setStatus(event.target.value); }}><option value="">All statuses</option><option value="SUCCESS">Success</option><option value="ERROR">Error</option></SelectField></label>
          <label className="space-y-1 text-sm"><span className="field-label">Search</span><TextField value={search} onChange={(event) => { setPage(1); setSearch(event.target.value); }} placeholder="Correlation or request id" /></label>
        </CardContent>
      </Card>

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="panel-soft"><CardHeader><CardTitle>Total spend</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{summary ? formatUsdMicros(summary.totals.totalCostMicros) : "-"}</CardContent></Card>
        <Card className="panel-soft"><CardHeader><CardTitle>Requests</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{summary ? formatNumber(summary.totals.requests) : "-"}</CardContent></Card>
        <Card className="panel-soft"><CardHeader><CardTitle>Input tokens</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{summary ? formatNumber(summary.totals.inputTokens) : "-"}</CardContent></Card>
        <Card className="panel-soft"><CardHeader><CardTitle>Output tokens</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{summary ? formatNumber(summary.totals.outputTokens) : "-"}</CardContent></Card>
      </div>

      <Card className="panel-soft mb-6">
        <CardHeader><CardTitle>Per model</CardTitle></CardHeader>
        <CardContent className="grid gap-3 lg:grid-cols-2">
          {summary?.perModel.length ? summary.perModel.map((item) => (
            <div key={item.model} className="detail-box flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">{item.model}</p>
                <p className="body-muted text-xs">{formatNumber(item.requests)} requests</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold">{formatUsdMicros(item.totalCostMicros)}</p>
                <p className="body-muted text-xs">{formatNumber(item.inputTokens)} in / {formatNumber(item.outputTokens)} out</p>
              </div>
            </div>
          )) : <p className="body-muted text-sm">No matching rows.</p>}
        </CardContent>
      </Card>

      <Card className="panel-soft">
        <CardHeader><CardTitle>Usage ledger</CardTitle></CardHeader>
        <CardContent>
          {errorMessage ? <p className="status-error mb-4 text-sm">{errorMessage}</p> : null}
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-2 text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-[0.16em] text-[var(--ink-soft)]">
                  <th className="px-3 py-2">Timestamp</th>
                  <th className="px-3 py-2">Feature</th>
                  <th className="px-3 py-2">Operation</th>
                  <th className="px-3 py-2">Model</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Input</th>
                  <th className="px-3 py-2">Output</th>
                  <th className="px-3 py-2">Spend</th>
                  <th className="px-3 py-2">Context</th>
                  <th className="px-3 py-2">Correlation</th>
                </tr>
              </thead>
              <tbody>
                {list?.items.map((item) => (
                  <tr key={item.id} className="rounded-xl bg-[color-mix(in_srgb,var(--warm-white)_78%,transparent)]">
                    <td className="rounded-l-xl px-3 py-3 align-top">{new Date(item.createdAt).toLocaleString("en-US")}</td>
                    <td className="px-3 py-3 align-top">{item.feature}</td>
                    <td className="px-3 py-3 align-top">{item.operation}</td>
                    <td className="px-3 py-3 align-top">{item.model}</td>
                    <td className="px-3 py-3 align-top">{item.status}</td>
                    <td className="px-3 py-3 align-top">{formatNumber(item.inputTokens)}</td>
                    <td className="px-3 py-3 align-top">{formatNumber(item.outputTokens)}</td>
                    <td className="px-3 py-3 align-top font-medium">{formatUsdMicros(item.totalCostMicros)}</td>
                    <td className="px-3 py-3 align-top">{item.user?.email ?? item.user?.username ?? item.user?.firstName ?? "Unknown"}<div className="body-muted text-xs">{item.couple?.name ?? "No couple"}</div></td>
                    <td className="rounded-r-xl px-3 py-3 align-top"><div className="break-all font-mono text-xs">{item.correlationId}</div>{item.providerRequestId ? <div className="body-muted mt-1 break-all font-mono text-xs">{item.providerRequestId}</div> : null}{item.errorMessage ? <div className="status-error mt-1 text-xs">{item.errorMessage}</div> : null}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="body-muted text-sm">Page {list?.page ?? 1} of {list?.totalPages ?? 1}. {formatNumber(list?.totalItems ?? 0)} rows total.</p>
            <div className="flex gap-3">
              <button className="rounded-full border px-4 py-2 text-sm" disabled={!list || list.page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</button>
              <button className="rounded-full border px-4 py-2 text-sm" disabled={!list || list.page >= list.totalPages} onClick={() => setPage((current) => current + 1)}>Next</button>
            </div>
          </div>
        </CardContent>
      </Card>
    </AdminFrame>
  );
}
