"use client";

import { useMemo } from "react";
import { Loader2 } from "lucide-react";

import { BrandMark } from "@/components/marketing/brand-mark";
import { AppLink } from "@/components/navigation/app-link";
import { useRouteTransitionPageReady } from "@/components/navigation/route-transition-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeaderActions } from "@/components/ui/page-header-actions";
import { SelectField } from "@/components/ui/select-field";

import { DashboardMetrics } from "./dashboard-metrics";
import { DashboardRangeFilter } from "./dashboard-range-filter";
import { DashboardRecents } from "./dashboard-recents";
import { DashboardSearchField } from "./dashboard-search-field";
import { DashboardViewSelect } from "./dashboard-view-select";
import { formatDashboardDateLabel } from "./dashboard-format";
import { useDashboardWorkspace } from "./use-dashboard-workspace";

export function DashboardPage() {
  const workspace = useDashboardWorkspace("overview");
  const summary = workspace.summary;
  const isPageReady = Boolean(workspace.data || workspace.error);
  const hasPartnerConnection = Boolean(workspace.data?.profile.activeCouple);
  const effectiveViewMode = hasPartnerConnection ? workspace.viewMode : "PERSONAL";

  useRouteTransitionPageReady(isPageReady);

  const metricsHeading = useMemo(() => (effectiveViewMode === "PERSONAL" ? "Personal lens" : "Shared lens"), [effectiveViewMode]);
  const metricsDescription = useMemo(
    () =>
      effectiveViewMode === "PERSONAL"
        ? hasPartnerConnection
          ? "See only your own income, expenses, and balance inside the selected range."
          : "No partner is linked, so this dashboard shows personal totals only."
        : "See the combined workspace totals inside the selected range.",
    [effectiveViewMode, hasPartnerConnection]
  );

  if (!workspace.data && !workspace.error) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-3xl items-center justify-center px-5 py-16 sm:px-8">
        <Card className="panel-soft w-full max-w-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="size-5 animate-spin text-pop" />
              Loading dashboard
            </CardTitle>
          </CardHeader>
        </Card>
      </main>
    );
  }

  if (!workspace.data || !summary) {
    return (
      <main className="container-shell pb-16 pt-24">
        <Card className="panel-soft border-red-300/20 bg-red-500/10 dark:border-red-400/30 dark:bg-red-500/10">
          <CardContent className="pt-6">
            <p className="status-error text-sm">{workspace.error}</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="container-shell pb-16 pt-24">
      <header className="soft-rise mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-4xl space-y-4">
          <BrandMark href="/" />
          <div>
            <p className="eyebrow-row">Dashboard</p>
            <h1 className="mt-5 font-[family-name:var(--font-heading)] text-[clamp(38px,4vw,56px)] font-light leading-[1.08]">Transactions at a glance.</h1>
            <p className="body-muted mt-3 text-sm">
              Workspace: {workspace.workspaceName} · Active range: {workspace.data.filter.label}
            </p>
          </div>
        </div>
        <PageHeaderActions>
          {workspace.isRefreshing ? <span className="body-muted text-xs uppercase tracking-[0.16em]">Refreshing</span> : null}
          <Button variant="outline" asChild>
            <AppLink href="/dashboard/trends">Open trends</AppLink>
          </Button>
          <Button variant="outline" asChild>
            <AppLink href="/profile/me">Back to profile</AppLink>
          </Button>
        </PageHeaderActions>
      </header>

      {!hasPartnerConnection ? (
        <Card className="panel-soft mb-6 border-[rgba(201,168,76,0.18)]">
          <CardContent className="pt-6">
            <p className="body-muted text-sm">No partner is linked. Dashboard metrics are purely personal until you connect one.</p>
          </CardContent>
        </Card>
      ) : null}

      <section className="mb-6 flex flex-wrap items-end gap-3">
        <DashboardViewSelect
          value={effectiveViewMode}
          options={hasPartnerConnection ? workspace.data.availableViews : ["PERSONAL"]}
          onChange={(value) => {
            workspace.setViewMode(value);
            workspace.setPage(1);
          }}
        />
        <label className="space-y-1 text-sm">
          <span className="field-label">Display currency</span>
          <SelectField
            value={workspace.displayCurrency}
            onChange={(event) => workspace.setDisplayCurrency(event.target.value as typeof workspace.displayCurrency)}
            className="min-w-[112px]"
          >
            {workspace.data.supportedCurrencies.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </SelectField>
        </label>
        <DashboardSearchField
          className="min-w-[240px] flex-1"
          value={workspace.searchDraft}
          onChange={(value) => {
            workspace.setSearchDraft(value);
            workspace.setPage(1);
          }}
        />
      </section>

      <DashboardRangeFilter
        preset={workspace.selectedPreset}
        draftFrom={workspace.draftFrom}
        draftTo={workspace.draftTo}
        draftMonthKey={workspace.draftMonthKey}
        isRefreshing={workspace.isRefreshing}
        weekStartsOn={workspace.data.filters.weekStartsOn}
        activeLabel={workspace.data.filter.label}
        activeFrom={formatDashboardDateLabel(workspace.data.filter.appliedFrom)}
        activeTo={formatDashboardDateLabel(workspace.data.filter.appliedTo)}
        onPresetChange={(preset) => {
          workspace.setSelectedPreset(preset);
          workspace.setPage(1);
          if (preset !== "CUSTOM") {
            workspace.setDraftFrom("");
            workspace.setDraftTo("");
          }
          if (preset !== "SPECIFIC_MONTH") {
            workspace.setDraftMonthKey("");
          }
        }}
        onDraftFromChange={(value) => {
          workspace.setDraftFrom(value);
          workspace.setPage(1);
        }}
        onDraftToChange={(value) => {
          workspace.setDraftTo(value);
          workspace.setPage(1);
        }}
        onDraftMonthKeyChange={(value) => {
          workspace.setDraftMonthKey(value);
          workspace.setPage(1);
        }}
        onApplyCustom={() => {
          workspace.setSelectedPreset("CUSTOM");
          workspace.setPage(1);
        }}
        onApplyMonth={() => {
          workspace.setSelectedPreset("SPECIFIC_MONTH");
          workspace.setPage(1);
        }}
      />

      <DashboardMetrics
        heading={metricsHeading}
        description={metricsDescription}
        totalIncome={summary.totalIncome}
        totalExpense={summary.totalExpense}
        balance={summary.balance}
        currency={workspace.displayCurrency}
      />

      <DashboardRecents
        transactions={workspace.data.transactions}
        displayCurrency={workspace.displayCurrency}
        rates={workspace.data.rates}
        onPageChange={(value) => workspace.setPage(value)}
        isLoadingData={workspace.isRefreshing}
        isDeletingId={workspace.isDeletingId}
        editingTransaction={workspace.editingTransaction}
        categoryCatalog={workspace.data.filters.categories}
        setEditingTransaction={workspace.setEditingTransaction}
        isSavingEdit={workspace.isSavingEdit}
        onStartEditing={workspace.startEditing}
        onSaveEdit={workspace.onSaveEdit}
        onDeleteTransaction={workspace.onDeleteTransaction}
        statusMessage={workspace.txMessage}
        statusError={workspace.txError}
      />
    </main>
  );
}
