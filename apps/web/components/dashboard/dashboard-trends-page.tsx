"use client";

import { useMemo } from "react";
import { Loader2 } from "lucide-react";

import { BrandMark } from "@/components/marketing/brand-mark";
import { WorkspaceHeaderMenu } from "@/components/navigation/workspace-header-menu";
import { useRouteTransitionPageReady } from "@/components/navigation/route-transition-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SelectField } from "@/components/ui/select-field";

import { DashboardAdvancedFilters } from "./dashboard-advanced-filters";
import { DashboardBreakdownPanel } from "./dashboard-breakdown";
import { DashboardKindSelect } from "./dashboard-kind-select";
import { DashboardMetrics } from "./dashboard-metrics";
import { DashboardRangeFilter } from "./dashboard-range-filter";
import { DashboardSearchField } from "./dashboard-search-field";
import { DashboardTrendChart } from "./dashboard-trend-chart";
import { DashboardViewSelect } from "./dashboard-view-select";
import { formatDashboardDateLabel } from "./dashboard-format";
import { useDashboardWorkspace } from "./use-dashboard-workspace";

export function DashboardTrendsPage() {
  const workspace = useDashboardWorkspace("trends");
  const summary = workspace.summary;
  const isPageReady = Boolean(workspace.data || workspace.error);
  const hasPartnerConnection = Boolean(workspace.data?.profile.hasPartnerConnection);
  const effectiveViewMode = hasPartnerConnection ? workspace.viewMode : "PERSONAL";
  const effectiveActor = hasPartnerConnection ? workspace.actor : "EVERYONE";

  useRouteTransitionPageReady(isPageReady);

  const metricsHeading = useMemo(() => (effectiveViewMode === "PERSONAL" ? "Personal view" : "Shared view"), [effectiveViewMode]);

  if (!workspace.data && !workspace.error) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-3xl items-center justify-center px-5 py-16 sm:px-8">
        <Card className="panel-soft w-full max-w-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="size-5 animate-spin text-pop" />
              Loading trends
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
      <header className="soft-rise mb-8 flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-4xl space-y-4">
          <BrandMark href="/" />
          <div>
            <p className="eyebrow-row">Trends</p>
            <h1 className="mt-5 font-[family-name:var(--font-heading)] text-[clamp(38px,4vw,56px)] font-light leading-[1.08]">Transactions breakdown.</h1>
          </div>
        </div>
        <WorkspaceHeaderMenu />
      </header>

      <section className="mb-6 grid gap-3 lg:grid-cols-[minmax(0,220px)_minmax(0,180px)_minmax(0,180px)_minmax(0,1fr)] lg:items-end">
        <DashboardViewSelect
          value={effectiveViewMode}
          options={workspace.data.availableViews}
          disabledOptions={hasPartnerConnection ? [] : ["COUPLE"]}
          onChange={(value) => {
            workspace.setViewMode(value);
            workspace.setPage(1);
          }}
        />
        <DashboardKindSelect
          value={workspace.kind}
          onChange={(value) => {
            workspace.setKind(value);
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
            {workspace.data.supportedCurrencies.map((item) => (
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

      <DashboardAdvancedFilters
        categoryCatalog={workspace.data.filters.categories}
        kind={workspace.kind}
        showKind={false}
        categoryId={workspace.categoryId}
        actor={effectiveActor}
        hasActivePartnerConnection={hasPartnerConnection}
        onKindChange={(value) => {
          workspace.setKind(value);
          workspace.setPage(1);
        }}
        onCategoryChange={(value) => {
          workspace.setCategoryId(value);
          workspace.setPage(1);
        }}
        onActorChange={(value) => {
          workspace.setActor(value);
          workspace.setPage(1);
        }}
      />

      <DashboardMetrics heading={metricsHeading} totalIncome={summary.totalIncome} totalExpense={summary.totalExpense} balance={summary.balance} currency={workspace.displayCurrency} />

      <DashboardTrendChart charts={workspace.data.charts} displayCurrency={workspace.displayCurrency} rates={workspace.data.rates} />

      <DashboardBreakdownPanel charts={workspace.data.charts} displayCurrency={workspace.displayCurrency} rates={workspace.data.rates} kind={workspace.kind} />
    </main>
  );
}
