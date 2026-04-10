"use client";

import { ExternalLink, Loader2 } from "lucide-react";
import { useMemo } from "react";

import { BrandMark } from "@/components/marketing/brand-mark";
import { WorkspaceHeaderMenu } from "@/components/navigation/workspace-header-menu";
import { useRouteTransitionPageReady } from "@/components/navigation/route-transition-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/cn";

import { currencyLabels } from "@/components/profile/types";

import { DashboardRatesSelector } from "./dashboard-rates-selector";
import { useDashboardRatesWorkspace } from "./use-dashboard-rates-workspace";

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Tashkent"
  }).format(new Date(value));
}

function formatRate(value: number) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

export function DashboardRatesPage() {
  const workspace = useDashboardRatesWorkspace();
  const isPageReady = Boolean(workspace.data || workspace.error);

  useRouteTransitionPageReady(isPageReady);

  const selectedRates = useMemo(() => {
    if (!workspace.data) {
      return [];
    }

    return workspace.draftCurrencies.map((currency) => ({
      currency,
      label: currencyLabels[currency],
      rate: workspace.data?.rates[currency] ?? 0
    }));
  }, [workspace.data, workspace.draftCurrencies]);

  const lastUpdatedAtLabel = workspace.data ? formatDateTime(workspace.data.lastUpdatedAt) : "Not available";

  if (workspace.isLoading && !workspace.data && !workspace.error) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-3xl items-center justify-center px-5 py-16 sm:px-8">
        <Card className="panel-soft w-full max-w-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="size-5 animate-spin text-pop" />
              Loading exchange rates
            </CardTitle>
          </CardHeader>
        </Card>
      </main>
    );
  }

  if (!workspace.data) {
    return (
      <main className="container-shell pb-16 pt-24">
        <Card className="panel-soft border-red-300/20 bg-red-500/10 dark:border-red-400/30 dark:bg-red-500/10">
          <CardContent className="pt-6">
            <p className="status-error text-sm">{workspace.error ?? "Could not load exchange rates"}</p>
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
          <div className="space-y-3">
            <p className="eyebrow-row">Rates</p>
            <h1 className="font-[family-name:var(--font-heading)] text-[clamp(38px,4vw,56px)] font-light leading-[1.08]">
              Exchange rates at a glance.
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[var(--ink-soft)]">
              <span>Last update: {lastUpdatedAtLabel}</span>
              <a
                href={workspace.data.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="secondary-link inline-flex items-center gap-1"
              >
                CBU source
                <ExternalLink className="size-3.5" />
              </a>
            </div>
          </div>
        </div>
        <WorkspaceHeaderMenu />
      </header>

      <Card className="panel-soft mb-6">
        <CardHeader>
          <CardTitle className="text-[22px]">Customize displayed currencies</CardTitle>
          <CardDescription>
            Pick the currencies you want to keep visible. The list below always shows only the currencies you selected.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <div className="space-y-1 text-sm">
              <span className="field-label">Display currencies</span>
              <DashboardRatesSelector
                value={workspace.draftCurrencies}
                disabled={workspace.isLoading || workspace.isSaving}
                onChange={workspace.updateDraftCurrencies}
              />
            </div>
            <Button
              type="button"
              className="w-full md:w-auto"
              disabled={workspace.isSaving || !workspace.isDirty}
              pending={workspace.isSaving}
              pendingText="Saving"
              onClick={() => {
                void workspace.saveSelection();
              }}
            >
              Save selection
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[var(--ink-soft)]" aria-live="polite">
            {workspace.message ? <p className="text-[var(--ink)]">{workspace.message}</p> : null}
            {workspace.error ? <p className="status-error">{workspace.error}</p> : null}
            {!workspace.error ? (
              workspace.isDirty ? <p>Preview changes before saving them.</p> : <p>Selection saved and ready.</p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow-row">Selected rates</p>
            <h2 className="mt-4 font-[family-name:var(--font-heading)] text-[clamp(28px,3vw,38px)] font-light leading-[1.08]">
              Live snapshot
            </h2>
          </div>
          <span className="text-sm text-[var(--ink-soft)]">{selectedRates.length} selected</span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {selectedRates.map((item) => (
            <Card key={item.currency} className="panel-soft h-full">
              <CardHeader className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--ink-soft)]">{item.currency}</p>
                    <CardTitle className="text-[22px] leading-[1.15]">{item.label}</CardTitle>
                  </div>
                  <span
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]",
                      item.currency === "UZS"
                        ? "border-[rgba(201,168,76,0.22)] bg-[color-mix(in_srgb,var(--gold)_12%,transparent)] text-[var(--ink)]"
                        : "border-[rgba(201,168,76,0.14)] text-[var(--ink-soft)]"
                    )}
                  >
                    {item.currency === "UZS" ? "Base" : "Live"}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="font-[family-name:var(--font-body)] text-[clamp(28px,4vw,42px)] font-medium leading-[1] tabular-nums">
                  1 {item.currency} = {formatRate(item.rate)} UZS
                </p>
                <p className="text-sm leading-6 text-[var(--ink-soft)]">Updated {lastUpdatedAtLabel}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
