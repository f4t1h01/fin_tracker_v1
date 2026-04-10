"use client";

import { useState } from "react";

import { AdminFrame } from "@/components/admin/admin-frame";
import { adminFetch } from "@/components/admin/client";
import type { AdminSqlExecuteResponse } from "@/components/admin/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TextareaField } from "@/components/ui/textarea-field";

const starterQuery = "SELECT id, email, created_at FROM \"0admin\" LIMIT 10";

export default function AdminSqlPage() {
  const [statement, setStatement] = useState(starterQuery);
  const [result, setResult] = useState<AdminSqlExecuteResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onRun = async () => {
    setError(null);
    try {
      const payload = await adminFetch<AdminSqlExecuteResponse>("/0admin/sql/execute", {
        method: "POST",
        body: JSON.stringify({ statement })
      });
      setResult(payload);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "SQL execution failed");
    }
  };

  return (
    <AdminFrame title="SQL console" description="Audited read-only SQL execution. Only single SELECT, WITH ... SELECT, and EXPLAIN statements are allowed.">
      <Card className="panel-soft mb-6">
        <CardHeader><CardTitle>Statement</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <TextareaField rows={8} value={statement} onChange={(event) => setStatement(event.target.value)} />
          <div className="flex items-center gap-3">
            <Button type="button" onClick={onRun}>Run query</Button>
            <p className="body-muted text-xs">Row cap, timeout, payload cap, and audit logging are enforced server-side.</p>
          </div>
          {error ? <p className="status-error text-sm">{error}</p> : null}
          {result?.error ? <p className="status-error text-sm">{result.error}</p> : null}
        </CardContent>
      </Card>

      <Card className="panel-soft">
        <CardHeader><CardTitle>Result</CardTitle></CardHeader>
        <CardContent>
          <p className="body-muted mb-3 text-sm">Rows: {result?.rowCount ?? 0} • Duration: {result?.durationMs ?? 0} ms {result?.truncated ? "• Truncated" : ""}</p>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr>{result?.columns.map((column) => <th key={column} className="px-3 py-2 text-left">{column}</th>)}</tr>
              </thead>
              <tbody>
                {result?.rows.map((row, index) => (
                  <tr key={index}>
                    {result.columns.map((column) => <td key={column} className="px-3 py-2 align-top"><pre className="whitespace-pre-wrap text-xs">{JSON.stringify(row[column], null, 2)}</pre></td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </AdminFrame>
  );
}
