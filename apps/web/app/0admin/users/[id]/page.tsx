"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";

import { AdminFrame } from "@/components/admin/admin-frame";
import { adminFetch, formatNumber, formatUsdMicros } from "@/components/admin/client";
import type { AdminUserDetailResponse } from "@/components/admin/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";

export default function AdminUserDetailPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<AdminUserDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetReason, setResetReason] = useState("");
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);

  useEffect(() => {
    if (!params.id) {
      return;
    }

    void adminFetch<AdminUserDetailResponse>(`/0admin/users/${params.id}`)
      .then(setData)
      .catch((reason) => {
        if (reason instanceof Error && reason.message !== "UNAUTHORIZED") {
          setError(reason.message);
        }
      });
  }, [params.id]);

  async function handlePasswordReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResetMessage(null);
    setResetError(null);
    setIsResettingPassword(true);

    try {
      const response = await adminFetch<{ ok: boolean; passwordSetAt: string }>(`/0admin/users/${params.id}/password`, {
        method: "POST",
        body: JSON.stringify({
          newPassword,
          reason: resetReason
        })
      });

      setData((current) =>
        current
          ? {
              ...current,
              user: {
                ...current.user,
                hasPassword: true,
                passwordSetAt: response.passwordSetAt
              }
            }
          : current
      );
      setNewPassword("");
      setResetReason("");
      setResetMessage("User password was reset.");
    } catch (reason) {
      if (reason instanceof Error && reason.message !== "UNAUTHORIZED") {
        setResetError(reason.message);
      }
    } finally {
      setIsResettingPassword(false);
    }
  }

  return (
    <AdminFrame title="User detail" description="Profile, defaults, workspace links, transactions, and AI usage for one user.">
      {error ? <p className="status-error mb-4 text-sm">{error}</p> : null}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="panel-soft">
          <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><span className="body-muted">Email:</span> {data?.user.email ?? "-"}</p>
            <p><span className="body-muted">Username:</span> {data?.user.username ?? "-"}</p>
            <p><span className="body-muted">Name:</span> {data?.user.firstName ?? "-"} {data?.user.lastName ?? ""}</p>
            <p><span className="body-muted">Bind:</span> {data?.user.bind?.couple.name ?? "No active bind"}</p>
            <p><span className="body-muted">Website password:</span> {data?.user.hasPassword ? "Configured" : "Not configured"}</p>
            <p><span className="body-muted">Password set:</span> {data?.user.passwordSetAt ? new Date(data.user.passwordSetAt).toLocaleString("en-US") : "-"}</p>
            <p><span className="body-muted">Defaults:</span> {data?.user.defaults.income?.name ?? "No income default"} / {data?.user.defaults.expense?.name ?? "No expense default"}</p>
            <p><span className="body-muted">Summary:</span> {formatNumber(data?.summary.transactionCount ?? 0)} tx • {formatUsdMicros((data?.summary.totalAmountInUzs ?? 0) * 1000000)}</p>
          </CardContent>
        </Card>

        <Card className="panel-soft">
          <CardHeader><CardTitle>Memberships</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {data?.user.memberships.map((membership) => (
              <div key={`${membership.couple.id}-${membership.role}`} className="rounded-xl border border-[rgba(201,168,76,0.16)] px-3 py-2">
                <Link href={`/0admin/couples/${membership.couple.id}`}>{membership.couple.name}</Link>
                <div className="body-muted text-xs">{membership.role}</div>
              </div>
            )) ?? <p className="body-muted">Loading memberships...</p>}
          </CardContent>
        </Card>
      </div>

      <Card className="panel-soft mt-4">
        <CardHeader><CardTitle>Reset website password</CardTitle></CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_auto]" onSubmit={handlePasswordReset}>
            <TextField
              required
              minLength={8}
              type="password"
              value={newPassword}
              placeholder="New password"
              disabled={!data?.user.email || isResettingPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
            <TextField
              required
              minLength={3}
              value={resetReason}
              placeholder="Reason for audit log"
              disabled={!data?.user.email || isResettingPassword}
              onChange={(event) => setResetReason(event.target.value)}
            />
            <Button type="submit" disabled={!data?.user.email || isResettingPassword} pending={isResettingPassword} pendingText="Resetting...">
              Reset password
            </Button>
          </form>
          {!data?.user.email ? <p className="body-muted mt-3 text-sm">This user has no email, so website password login is unavailable.</p> : null}
          {resetMessage ? <p className="status-success mt-3 text-sm">{resetMessage}</p> : null}
          {resetError ? <p className="status-error mt-3 text-sm">{resetError}</p> : null}
        </CardContent>
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="panel-soft">
          <CardHeader><CardTitle>Recent transactions</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {data?.recentTransactions.map((item) => (
              <Link key={item.id} href={`/0admin/transactions/${item.id}`} className="block rounded-xl border border-[rgba(201,168,76,0.16)] px-3 py-2">
                <div className="flex items-center justify-between gap-3">
                  <span>{item.category.name}</span>
                  <span>{item.currency} {item.amount}</span>
                </div>
                <div className="body-muted text-xs">{new Date(item.happenedAt).toLocaleString("en-US")}</div>
              </Link>
            )) ?? <p className="body-muted">Loading transactions...</p>}
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
