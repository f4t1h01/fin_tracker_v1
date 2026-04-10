"use client";

import { useEffect, useState } from "react";

import { AdminFrame } from "@/components/admin/admin-frame";
import { adminFetch, formatNumber } from "@/components/admin/client";
import type { AdminSecurityResponse } from "@/components/admin/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TextField } from "@/components/ui/text-field";

export default function AdminSecurityPage() {
  const [data, setData] = useState<AdminSecurityResponse | null>(null);
  const [reason, setReason] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const load = () => {
    void adminFetch<AdminSecurityResponse>("/0admin/security").then(setData).catch(() => null);
  };

  useEffect(() => {
    load();
  }, []);

  const toggleAdmin = async (email: string, isActive: boolean) => {
    await adminFetch(`/0admin/security/admins/${encodeURIComponent(email)}/status`, {
      method: "POST",
      body: JSON.stringify({ isActive: !isActive, reason })
    });
    load();
  };

  const resetPassword = async (email: string) => {
    await adminFetch(`/0admin/security/admins/${encodeURIComponent(email)}/password`, {
      method: "POST",
      body: JSON.stringify({ newPassword, reason })
    });
    setNewPassword("");
    load();
  };

  return (
    <AdminFrame title="Security" description="Admin account status, password resets, failed logins, and recent auth audit events.">
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <Card className="panel-soft"><CardHeader><CardTitle>Admins</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{formatNumber(data?.stats.totalAdmins ?? 0)}</CardContent></Card>
        <Card className="panel-soft"><CardHeader><CardTitle>Failed logins</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{formatNumber(data?.stats.failedLogins ?? 0)}</CardContent></Card>
      </div>

      <Card className="panel-soft mb-6">
        <CardHeader><CardTitle>Action input</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <TextField value={reason} placeholder="Reason for audit log" onChange={(event) => setReason(event.target.value)} />
          <TextField value={newPassword} placeholder="New password for reset" onChange={(event) => setNewPassword(event.target.value)} />
        </CardContent>
      </Card>

      <Card className="panel-soft mb-6">
        <CardHeader><CardTitle>Admin accounts</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {data?.admins.map((admin) => (
            <div key={admin.email} className="rounded-2xl border border-[rgba(201,168,76,0.16)] px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{admin.email}</p>
                  <p className="body-muted text-xs">{admin.isActive ? "Active" : "Inactive"} • Last login {admin.lastLoginAt ? new Date(admin.lastLoginAt).toLocaleString("en-US") : "never"}</p>
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => toggleAdmin(admin.email, admin.isActive)}>
                    {admin.isActive ? "Deactivate" : "Reactivate"}
                  </Button>
                  <Button type="button" onClick={() => resetPassword(admin.email)}>
                    Reset password
                  </Button>
                </div>
              </div>
            </div>
          )) ?? <p className="body-muted">Loading admins...</p>}
        </CardContent>
      </Card>

      <Card className="panel-soft">
        <CardHeader><CardTitle>Recent auth audit</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          {data?.recentAudit.map((item) => (
            <div key={item.id} className="rounded-xl border border-[rgba(201,168,76,0.16)] px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <span>{item.actionType}</span>
                <span>{item.outcome}</span>
              </div>
              <div className="body-muted text-xs">{item.adminEmail ?? "system"} • {new Date(item.createdAt).toLocaleString("en-US")}</div>
            </div>
          )) ?? <p className="body-muted">Loading audit...</p>}
        </CardContent>
      </Card>
    </AdminFrame>
  );
}
