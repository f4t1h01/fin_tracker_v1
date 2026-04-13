"use client";

import { useMemo } from "react";
import { Loader2 } from "lucide-react";

import { WorkspacePageHeader } from "@/components/navigation/workspace-page-header";
import { financeHeaderActionGroups } from "@/components/navigation/workspace-navigation";
import { useRouteTransitionPageReady } from "@/components/navigation/route-transition-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  const hasPartnerConnection = Boolean(workspace.data?.profile.hasPartnerConnection);
  const effectiveViewMode = hasPartnerConnection ? workspace.viewMode : "PERSONAL";

  useRouteTransitionPageReady(isPageReady);

  const metricsHeading = useMemo(() => (effectiveViewMode === "PERSONAL" ? "Personal view" : "Shared view"), [effectiveViewMode]);

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
      <WorkspacePageHeader eyebrow="Dashboard" title="Transactions at a glance." actions={financeHeaderActionGroups} />

      <section className="mb-6 grid gap-3 lg:grid-cols-[minmax(0,220px)_minmax(0,180px)_minmax(0,1fr)] lg:items-end">
        <DashboardViewSelect
          value={effectiveViewMode}
          options={workspace.data.availableViews}
          disabledOptions={hasPartnerConnection ? [] : ["COUPLE"]}
          onChange={(value) => {
            workspace.setViewMode(value);
            workspace.setPage(1);
          }}
        />
        <label className="space-y-1 text-sm">
          <span className="field-label">Currency</span>
          <SelectField
            value={workspace.displayCurrency}
            onChange={(event) => workspace.setDisplayCurrency(event.target.value as typeof workspace.displayCurrency)}
            className="min-w-[112px]"
          >
            {workspace.preferredCurrencies.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </SelectField>
        </label>
        <DashboardSearchField
          className="w-full min-w-0"
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
      />

      <DashboardMetrics heading={metricsHeading} totalIncome={summary.totalIncome} totalExpense={summary.totalExpense} balance={summary.balance} currency={workspace.displayCurrency} />

      <DashboardRecents
        transactions={workspace.data.transactions}
        displayCurrency={workspace.displayCurrency}
        rates={workspace.data.rates}
        onPageChange={(value) => workspace.setPage(value)}
        isLoadingData={workspace.isRefreshing}
        isDeletingId={workspace.isDeletingId}
        editingTransaction={workspace.editingTransaction}
        categoryCatalog={workspace.data.filters.categories}
        currencyOptions={workspace.preferredCurrencies}
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
