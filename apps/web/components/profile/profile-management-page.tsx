"use client";

import { useEffect } from "react";

import { BrandMark } from "@/components/marketing/brand-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { DatePicker } from "@/components/ui/date-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { ProfileLoadingState } from "./profile-loading-state";
import { useProfileWorkspace } from "./use-profile-workspace";

export function ProfileManagementPage() {
  const workspace = useProfileWorkspace({ routePath: "/profile/me/manage" });

  useEffect(() => {
    if (!workspace.isAuthenticating && !workspace.token) {
      window.location.replace("/profile/me");
    }
  }, [workspace.isAuthenticating, workspace.token]);

  if (workspace.isAuthenticating) {
    return <ProfileLoadingState title="Preparing profile management" description="Checking your saved session..." />;
  }

  if (!workspace.token) {
    return null;
  }

  if (!workspace.profile || !workspace.authMe) {
    return <ProfileLoadingState title="Loading profile management" description={workspace.authError ?? "Fetching profile details and connections..."} />;
  }

  return (
    <main className="container-shell pb-16 pt-28">
      <header className="soft-rise mb-8 flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-4">
          <BrandMark href="/" />
          <div>
            <div className="eyebrow-row">Profile management</div>
            <h1 className="mt-5 font-[family-name:var(--font-heading)] text-[clamp(38px,4vw,56px)] font-light leading-[1.08]">{workspace.greeting}</h1>
            <p className="body-muted mt-3 text-sm">Manage your details, account links, and appearance settings here.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle onChange={(theme) => void workspace.onThemeChange(theme)} />
          <Button variant="outline" asChild><a href="/profile/me">Back to profile</a></Button>
        </div>
      </header>

      {workspace.authError ? <Card className="mb-6 border-red-300/20 bg-red-500/10 dark:border-red-400/30 dark:bg-red-500/10"><CardContent className="pt-6"><p className="status-error text-sm">{workspace.authError}</p></CardContent></Card> : null}

      <section className="grid gap-5 lg:grid-cols-2">
        <Card className="panel-soft">
          <CardHeader>
            <CardTitle>Your details</CardTitle>
            <CardDescription>Keep your profile name and birthday up to date. Telegram username is shown as a linked identity.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={workspace.onSaveDetails}>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="space-y-1 text-sm"><span className="field-label">First name</span><input value={workspace.detailsFirstName} onChange={(event) => workspace.setDetailsFirstName(event.target.value)} className="form-input" /></label>
                <label className="space-y-1 text-sm"><span className="field-label">Last name</span><input value={workspace.detailsLastName} onChange={(event) => workspace.setDetailsLastName(event.target.value)} className="form-input" /></label>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="space-y-1 text-sm"><span className="field-label">Birthday</span><DatePicker value={workspace.detailsBirthday} onChange={(event) => workspace.setDetailsBirthday(event.target.value)} max="9999-12-31" /></label>
                <label className="space-y-1 text-sm"><span className="field-label">Telegram username</span><input value={workspace.telegramUsername} readOnly className="form-input opacity-80" /></label>
              </div>
              <div className="flex flex-wrap items-center gap-3"><Button type="submit" disabled={workspace.isSavingDetails}>{workspace.isSavingDetails ? "Saving..." : "Save details"}</Button>{workspace.detailsMessage ? <p className="status-success text-sm">{workspace.detailsMessage}</p> : null}{workspace.detailsError ? <p className="status-error text-sm">{workspace.detailsError}</p> : null}</div>
            </form>
          </CardContent>
        </Card>

        <Card className="panel-soft">
          <CardHeader>
            <CardTitle>Bound accounts</CardTitle>
            <CardDescription>Review your saved website and Telegram connections.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="detail-box space-y-2 text-sm">
              <p>Email account: {workspace.authMe.email ?? "Not set yet"}</p>
              <p>Website password: {workspace.authMe.hasPassword ? "Configured" : "Not configured"}</p>
              <p>Telegram linked: {workspace.authMe.lastTelegramChatId ? "Yes" : "Not yet"}</p>
              <p>Telegram username: {workspace.telegramUsername}</p>
              <p>Telegram chat id: {workspace.authMe.lastTelegramChatId ?? "Unavailable"}</p>
              <p>Workspace code: {workspace.profile.user.coupleCode}</p>
            </div>
            <Button variant="outline" asChild><a href="https://t.me/coup_fin_trackerbot" target="_blank" rel="noreferrer">Open Telegram WebApp</a></Button>
          </CardContent>
        </Card>
      </section>

      {!workspace.authMe.hasPassword ? (
        <section className="mt-6">
          <Card className="panel-soft border-[rgba(201,168,76,0.2)] bg-[color-mix(in_srgb,var(--gold)_8%,var(--card-bg))]">
            <CardHeader><CardTitle>Save email login</CardTitle><CardDescription>Finish this once if your account started elsewhere and still needs a browser password.</CardDescription></CardHeader>
            <CardContent>
              <form className="grid gap-3 md:grid-cols-3" onSubmit={workspace.onSetupPassword}>
                <label className="space-y-1 text-sm"><span className="field-label">Email</span><input required type="email" value={workspace.setupEmail} onChange={(event) => workspace.setSetupEmail(event.target.value)} className="form-input" /></label>
                <label className="space-y-1 text-sm"><span className="field-label">Password</span><input required type="password" minLength={8} value={workspace.setupPassword} onChange={(event) => workspace.setSetupPassword(event.target.value)} className="form-input" /></label>
                <label className="space-y-1 text-sm"><span className="field-label">Confirm password</span><input required type="password" minLength={8} value={workspace.setupConfirmPassword} onChange={(event) => workspace.setSetupConfirmPassword(event.target.value)} className="form-input" /></label>
                <div className="flex items-center gap-3 md:col-span-3"><Button type="submit" disabled={workspace.isSettingPassword}>{workspace.isSettingPassword ? "Saving..." : "Save email login"}</Button>{workspace.setupMessage ? <p className="status-success text-sm">{workspace.setupMessage}</p> : null}{workspace.setupError ? <p className="status-error text-sm">{workspace.setupError}</p> : null}</div>
              </form>
            </CardContent>
          </Card>
        </section>
      ) : null}

      <section className="mt-6">
        <Card className="panel-soft">
          <CardHeader><CardTitle>Partner connection</CardTitle><CardDescription>Review or update your current couple connection.</CardDescription></CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={workspace.onBind}>
              <label className="space-y-1 text-sm"><span className="field-label">Partner code</span><input required value={workspace.bindCode} onChange={(event) => workspace.setBindCode(event.target.value.toUpperCase())} placeholder="AB12CD" className="form-input" /></label>
              <div className="flex flex-wrap items-center gap-3"><Button type="submit" variant="outline" disabled={workspace.isBinding}>{workspace.isBinding ? "Connecting..." : "Connect partner"}</Button>{workspace.bindMessage ? <p className="status-success text-sm">{workspace.bindMessage}</p> : null}{workspace.bindError ? <p className="status-error text-sm">{workspace.bindError}</p> : null}</div>
              <div className="detail-box text-sm"><p>Active workspace: {workspace.profile.activeCouple?.name ?? "None"}</p><p>Role: {workspace.profile.activeCouple?.role ?? "-"}</p><p>Last linked code: {workspace.profile.bind?.insertedCode ?? "Not linked yet"}</p></div>
            </form>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
