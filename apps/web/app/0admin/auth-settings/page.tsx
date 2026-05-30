"use client";

import { useEffect, useState } from "react";

import { AdminFrame } from "@/components/admin/admin-frame";
import { adminFetch } from "@/components/admin/client";
import type { AdminAuthSettingsResponse } from "@/components/admin/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TextField } from "@/components/ui/text-field";
import { TogglePill } from "@/components/ui/toggle-pill";

export default function AdminAuthSettingsPage() {
  const [data, setData] = useState<AdminAuthSettingsResponse | null>(null);
  const [emailPassword, setEmailPassword] = useState("");
  const [emailReason, setEmailReason] = useState("");
  const [googleReason, setGoogleReason] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [isSavingEmail, setIsSavingEmail] = useState(false);
  const [isSavingGoogle, setIsSavingGoogle] = useState(false);
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    const payload = await adminFetch<AdminAuthSettingsResponse>("/0admin/auth-settings");
    setData(payload);
  };

  useEffect(() => {
    void refresh().catch((reason) => {
      if (reason instanceof Error && reason.message !== "UNAUTHORIZED") {
        setError(reason.message);
      }
    });
  }, []);

  const updateEmail = async () => {
    if (!data) return;
    setMessage(null);
    setError(null);
    setIsSavingEmail(true);

    try {
      await adminFetch("/0admin/auth-settings/email", {
        method: "POST",
        body: JSON.stringify({
          ...data.email,
          smtpPassword: emailPassword || undefined,
          reason: emailReason
        })
      });
      setEmailPassword("");
      setEmailReason("");
      setMessage("Email provider settings saved.");
      await refresh();
    } catch (reason) {
      if (reason instanceof Error && reason.message !== "UNAUTHORIZED") {
        setError(reason.message);
      }
    } finally {
      setIsSavingEmail(false);
    }
  };

  const onSendTestEmail = async () => {
    setMessage(null);
    setError(null);
    setIsTestingEmail(true);

    try {
      await adminFetch("/0admin/auth-settings/email/test", {
        method: "POST",
        body: JSON.stringify({ toEmail: testEmail })
      });
      setTestEmail("");
      setMessage("Test email sent.");
    } catch (reason) {
      if (reason instanceof Error && reason.message !== "UNAUTHORIZED") {
        setError(reason.message);
      }
    } finally {
      setIsTestingEmail(false);
    }
  };

  const updateGoogle = async () => {
    if (!data) return;
    setMessage(null);
    setError(null);
    setIsSavingGoogle(true);

    try {
      await adminFetch("/0admin/auth-settings/google", {
        method: "POST",
        body: JSON.stringify({
          ...data.google,
          reason: googleReason
        })
      });
      setGoogleReason("");
      setMessage("Google auth settings saved.");
      await refresh();
    } catch (reason) {
      if (reason instanceof Error && reason.message !== "UNAUTHORIZED") {
        setError(reason.message);
      }
    } finally {
      setIsSavingGoogle(false);
    }
  };

  const email = data?.email;
  const google = data?.google;

  return (
    <AdminFrame title="Auth settings" description="Database-managed login providers for email codes and future Google sign-in. Secret fields are encrypted before storage.">
      {message ? <p className="status-success mb-4 text-sm">{message}</p> : null}
      {error ? <p className="status-error mb-4 text-sm">{error}</p> : null}

      <Card className="panel-soft mb-6">
        <CardHeader><CardTitle>Email code provider</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <TogglePill checked={Boolean(email?.isEnabled)} onToggle={(checked) => setData((current) => current ? { ...current, email: { ...current.email, isEnabled: checked } } : current)} label="Enable email codes" />
          <label className="space-y-1 text-sm"><span className="field-label">From email</span><TextField type="email" value={email?.fromEmail ?? ""} onChange={(event) => setData((current) => current ? { ...current, email: { ...current.email, fromEmail: event.target.value } } : current)} /></label>
          <label className="space-y-1 text-sm"><span className="field-label">From name</span><TextField value={email?.fromName ?? ""} onChange={(event) => setData((current) => current ? { ...current, email: { ...current.email, fromName: event.target.value } } : current)} /></label>
          <label className="space-y-1 text-sm"><span className="field-label">SMTP host</span><TextField value={email?.smtpHost ?? ""} onChange={(event) => setData((current) => current ? { ...current, email: { ...current.email, smtpHost: event.target.value } } : current)} /></label>
          <label className="space-y-1 text-sm"><span className="field-label">SMTP port</span><TextField type="number" min="1" max="65535" value={email?.smtpPort ?? 465} onChange={(event) => setData((current) => current ? { ...current, email: { ...current.email, smtpPort: Number(event.target.value) } } : current)} /></label>
          <TogglePill checked={Boolean(email?.smtpSecure)} onToggle={(checked) => setData((current) => current ? { ...current, email: { ...current.email, smtpSecure: checked } } : current)} label="Use TLS/SSL" />
          <label className="space-y-1 text-sm"><span className="field-label">SMTP user</span><TextField value={email?.smtpUser ?? ""} onChange={(event) => setData((current) => current ? { ...current, email: { ...current.email, smtpUser: event.target.value } } : current)} /></label>
          <label className="space-y-1 text-sm"><span className="field-label">SMTP password</span><TextField type="password" value={emailPassword} onChange={(event) => setEmailPassword(event.target.value)} placeholder={email?.hasSmtpPassword ? "Saved, leave blank to keep" : "Required if SMTP auth is used"} /></label>
          <label className="space-y-1 text-sm"><span className="field-label">Audit reason</span><TextField value={emailReason} onChange={(event) => setEmailReason(event.target.value)} placeholder="Why this config changed" /></label>
          <div className="flex flex-wrap items-center gap-3 md:col-span-2 xl:col-span-3">
            <Button type="button" onClick={() => void updateEmail()} disabled={!data || !emailReason.trim() || isSavingEmail} pending={isSavingEmail} pendingText="Saving...">Save email settings</Button>
            <span className="body-muted text-sm">{email?.updatedAt ? `Updated ${new Date(email.updatedAt).toLocaleString("en-US")}` : "Not configured yet"}</span>
          </div>
          <div className="grid gap-3 md:col-span-2 md:grid-cols-[1fr_auto] xl:col-span-3">
            <TextField type="email" value={testEmail} onChange={(event) => setTestEmail(event.target.value)} placeholder="Send test email to..." />
            <Button type="button" variant="outline" onClick={() => void onSendTestEmail()} disabled={!testEmail.trim() || isTestingEmail} pending={isTestingEmail} pendingText="Sending...">Send test</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="panel-soft">
        <CardHeader><CardTitle>Google login settings</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <TogglePill checked={Boolean(google?.isEnabled)} onToggle={(checked) => setData((current) => current ? { ...current, google: { ...current.google, isEnabled: checked } } : current)} label="Enable Google login" />
          <label className="space-y-1 text-sm"><span className="field-label">Client ID</span><TextField value={google?.clientId ?? ""} onChange={(event) => setData((current) => current ? { ...current, google: { ...current.google, clientId: event.target.value } } : current)} /></label>
          <label className="space-y-1 text-sm"><span className="field-label">Hosted domain</span><TextField value={google?.hostedDomain ?? ""} onChange={(event) => setData((current) => current ? { ...current, google: { ...current.google, hostedDomain: event.target.value } } : current)} placeholder="Optional, e.g. company.com" /></label>
          <TogglePill checked={Boolean(google?.autoCreateUsers)} onToggle={(checked) => setData((current) => current ? { ...current, google: { ...current.google, autoCreateUsers: checked } } : current)} label="Auto-create users" />
          <TogglePill checked={Boolean(google?.linkByVerifiedEmail)} onToggle={(checked) => setData((current) => current ? { ...current, google: { ...current.google, linkByVerifiedEmail: checked } } : current)} label="Link by verified email" />
          <label className="space-y-1 text-sm"><span className="field-label">Audit reason</span><TextField value={googleReason} onChange={(event) => setGoogleReason(event.target.value)} placeholder="Why this config changed" /></label>
          <div className="flex flex-wrap items-center gap-3 md:col-span-2">
            <Button type="button" onClick={() => void updateGoogle()} disabled={!data || !googleReason.trim() || isSavingGoogle} pending={isSavingGoogle} pendingText="Saving...">Save Google settings</Button>
            <span className="body-muted text-sm">{google?.updatedAt ? `Updated ${new Date(google.updatedAt).toLocaleString("en-US")}` : "Not configured yet"}</span>
          </div>
        </CardContent>
      </Card>
    </AdminFrame>
  );
}
