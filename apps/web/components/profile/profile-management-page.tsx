"use client";

import { useEffect } from "react";

import { BrandMark } from "@/components/marketing/brand-mark";
import { AppLink } from "@/components/navigation/app-link";
import { useRouteTransitionPageReady } from "@/components/navigation/route-transition-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { BoundAccountsCard } from "./management/bound-accounts-card";
import { PartnerConnectionCard } from "./management/partner-connection-card";
import { PasswordSetupCard } from "./management/password-setup-card";
import { ProfileDetailsCard } from "./management/profile-details-card";
import { ProfileLoadingState } from "./profile-loading-state";
import { useProfileWorkspace } from "./use-profile-workspace";

export function ProfileManagementPage() {
  const workspace = useProfileWorkspace({ routePath: "/profile/me/manage" });
  const isPageReady = !workspace.isAuthenticating && (!workspace.token || Boolean(workspace.authError || (workspace.profile && workspace.authMe)));

  useRouteTransitionPageReady(isPageReady);

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
          <Button variant="outline" asChild><AppLink href="/profile/me">Back to profile</AppLink></Button>
        </div>
      </header>

      {workspace.authError ? <Card className="mb-6 border-red-300/20 bg-red-500/10 dark:border-red-400/30 dark:bg-red-500/10"><CardContent className="pt-6"><p className="status-error text-sm">{workspace.authError}</p></CardContent></Card> : null}

      <section className="grid gap-5 lg:grid-cols-2">
        <ProfileDetailsCard detailsFirstName={workspace.detailsFirstName} setDetailsFirstName={workspace.setDetailsFirstName} detailsLastName={workspace.detailsLastName} setDetailsLastName={workspace.setDetailsLastName} detailsBirthday={workspace.detailsBirthday} setDetailsBirthday={workspace.setDetailsBirthday} telegramUsername={workspace.telegramUsername} isSavingDetails={workspace.isSavingDetails} detailsMessage={workspace.detailsMessage} detailsError={workspace.detailsError} onSaveDetails={workspace.onSaveDetails} />
        <BoundAccountsCard email={workspace.authMe.email} hasPassword={workspace.authMe.hasPassword} telegramUsername={workspace.telegramUsername} telegramId={workspace.authMe.telegramId} telegramDisplayName={workspace.telegramDisplayName} telegramPhone={workspace.authMe.telegramPhone} workspaceCode={workspace.profile.user.coupleCode} telegramConnectUrl={workspace.telegramConnectUrl} />
      </section>

      {!workspace.authMe.hasPassword ? (
        <section className="mt-6">
          <PasswordSetupCard setupEmail={workspace.setupEmail} setSetupEmail={workspace.setSetupEmail} setupPassword={workspace.setupPassword} setSetupPassword={workspace.setSetupPassword} setupConfirmPassword={workspace.setupConfirmPassword} setSetupConfirmPassword={workspace.setSetupConfirmPassword} isSettingPassword={workspace.isSettingPassword} setupMessage={workspace.setupMessage} setupError={workspace.setupError} onSetupPassword={workspace.onSetupPassword} />
        </section>
      ) : null}

      <section className="mt-6">
        <PartnerConnectionCard bindCode={workspace.bindCode} setBindCode={workspace.setBindCode} isBinding={workspace.isBinding} bindMessage={workspace.bindMessage} bindError={workspace.bindError} activeWorkspaceName={workspace.profile.activeCouple?.name ?? null} activeRole={workspace.profile.activeCouple?.role ?? null} insertedCode={workspace.profile.bind?.insertedCode ?? null} onBind={workspace.onBind} />
      </section>
    </main>
  );
}
