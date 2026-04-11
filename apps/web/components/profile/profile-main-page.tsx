"use client";

import { BrandMark } from "@/components/marketing/brand-mark";
import { WorkspaceHeaderMenu } from "@/components/navigation/workspace-header-menu";
import { useRouteTransitionPageReady } from "@/components/navigation/route-transition-provider";
import { Card, CardContent } from "@/components/ui/card";

import { AiFeaturesPanel } from "./ai-features-panel";
import type { AiTransactionDraftLike } from "./ai-draft-types";
import { buildSupportedCurrencyOptions } from "./currency-options";
import { ProfileAuthGateway } from "./profile-auth-gateway";
import { ProfileLoadingState } from "./profile-loading-state";
import { ProfileMetrics } from "./profile-metrics";
import { RecentTransactions } from "./recent-transactions";
import { TransactionEntry } from "./transaction-entry";
import { useProfileWorkspace } from "./use-profile-workspace";

export function ProfileMainPage() {
  const workspace = useProfileWorkspace({ routePath: "/profile/me" });
  const isPageReady = !workspace.isAuthenticating && (!workspace.token || Boolean(workspace.authError || (workspace.profile && workspace.authMe)));

  useRouteTransitionPageReady(isPageReady);

  if (workspace.isAuthenticating) {
    return <ProfileLoadingState title="Preparing your profile" description="Checking saved access and loading your workspace..." />;
  }

  if (!workspace.token) {
    return <ProfileAuthGateway {...workspace} />;
  }

  if (!workspace.profile || !workspace.authMe) {
    return <ProfileLoadingState title="Loading your workspace" description={workspace.authError ?? "Fetching profile, balances, and recent activity..."} />;
  }

  const applyAiDraft = (draft: AiTransactionDraftLike) => {
    if (draft.draft.kind) {
      workspace.setKind(draft.draft.kind);
    }

    if (typeof draft.draft.amount === "number") {
      workspace.setAmount(String(draft.draft.amount));
    }

    if (draft.draft.currency) {
      workspace.setCurrency(draft.draft.currency);
    }

    if (draft.draft.categoryId) {
      workspace.setSelectedCategoryId(draft.draft.categoryId);
    } else {
      workspace.setSelectedCategoryId("");
    }

    if (draft.draft.note !== null) {
      workspace.setNote(draft.draft.note);
    }
  };

  const entryCurrencyOptions = buildSupportedCurrencyOptions(workspace.preferredCurrencies, workspace.currency);
  const editingCurrencyOptions = workspace.editingTransaction
    ? buildSupportedCurrencyOptions(workspace.preferredCurrencies, workspace.editingTransaction.currency)
    : workspace.preferredCurrencies;

  return (
    <main className="container-shell pb-16 pt-28">
      <header className="soft-rise mb-8 flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-4">
          <BrandMark href="/" />
          <div>
            <div className="eyebrow-row">Profile workspace</div>
            <h1 className="mt-5 font-[family-name:var(--font-heading)] text-[clamp(38px,4vw,56px)] font-light leading-[1.08]">{workspace.greeting}</h1>
          </div>
        </div>
        <WorkspaceHeaderMenu onThemeChange={workspace.onThemeChange} />
      </header>

      {workspace.authError ? (
        <Card className="mb-6 border-red-300/20 bg-red-500/10 dark:border-red-400/30 dark:bg-red-500/10">
          <CardContent className="pt-6">
            <p className="status-error text-sm">{workspace.authError}</p>
          </CardContent>
        </Card>
      ) : null}

      <ProfileMetrics summary={workspace.summary} hasPartnerConnection={workspace.profile.hasPartnerConnection} />

      <TransactionEntry
        workspaceName={workspace.profile.activeCouple?.name ?? "Personal workspace"}
        kind={workspace.kind}
        setKind={workspace.setKind}
        amount={workspace.amount}
        setAmount={workspace.setAmount}
        currency={workspace.currency}
        setCurrency={workspace.setCurrency}
        currencyOptions={entryCurrencyOptions}
        categoryCatalog={workspace.categoryCatalog}
        selectedCategoryId={workspace.selectedCategoryId}
        setSelectedCategoryId={workspace.setSelectedCategoryId}
        note={workspace.note}
        setNote={workspace.setNote}
        txMessage={workspace.txMessage}
        txError={workspace.txError}
        isSubmittingTx={workspace.isSubmittingTx}
        onSubmit={workspace.onCreateTransaction}
      />

      <div className="mt-6">
        <AiFeaturesPanel token={workspace.token} categoryCatalog={workspace.categoryCatalog} onDraftResolved={applyAiDraft} />
      </div>

      <div className="mt-8">
        <RecentTransactions
          recent={workspace.recent}
          isLoadingData={workspace.isLoadingData}
          isDeletingId={workspace.isDeletingId}
          editingTransaction={workspace.editingTransaction}
          categoryCatalog={workspace.categoryCatalog}
          currencyOptions={editingCurrencyOptions}
          setEditingTransaction={workspace.setEditingTransaction}
          isSavingEdit={workspace.isSavingEdit}
          onStartEditing={workspace.startEditing}
          onSaveEdit={workspace.onSaveEdit}
          onDeleteTransaction={workspace.onDeleteTransaction}
        />
      </div>
    </main>
  );
}
