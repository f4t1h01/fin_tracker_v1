"use client";

import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

import { BrandMark } from "@/components/marketing/brand-mark";
import { AppLink } from "@/components/navigation/app-link";
import { useRouteTransitionPageReady } from "@/components/navigation/route-transition-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeaderActions } from "@/components/ui/page-header-actions";
import { SelectField } from "@/components/ui/select-field";
import { webEnv } from "@/lib/env";

import { parseApiResponse } from "@/components/profile/api";
import { clearDashboardCache, clearProfileSnapshotCache, readDashboardCache, writeDashboardCache } from "@/components/profile/cache";
import { DashboardResponse, tokenKey, type DashboardRangePreset, type DashboardViewMode, type SupportedCurrency } from "@/components/profile/types";

import { DashboardMetrics } from "./dashboard-metrics";
import { DashboardRangeFilter } from "./dashboard-range-filter";
import { DashboardRecents } from "./dashboard-recents";
import { DashboardViewSelect } from "./dashboard-view-select";

const useClientLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

function convertAmount(amountInUzs: number, rate: number) {
  if (rate <= 0) {
    return 0;
  }

  return Number((amountInUzs / rate).toFixed(2));
}

function formatDateLabel(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

export function DashboardPage() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [displayCurrency, setDisplayCurrency] = useState<SupportedCurrency>("UZS");
  const [viewMode, setViewMode] = useState<DashboardViewMode>("COUPLE");
  const [selectedPreset, setSelectedPreset] = useState<DashboardRangePreset>("THIS_WEEK");
  const [appliedFilter, setAppliedFilter] = useState<{ preset: DashboardRangePreset; from: string; to: string }>({ preset: "THIS_WEEK", from: "", to: "" });
  const [draftFrom, setDraftFrom] = useState("");
  const [draftTo, setDraftTo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useClientLayoutEffect(() => {
    const cached = readDashboardCache();
    if (cached) {
      setData(cached);
      setSelectedPreset(cached.filter.preset);
      setAppliedFilter({ preset: cached.filter.preset, from: cached.filter.from ?? "", to: cached.filter.to ?? "" });
      setDraftFrom(cached.filter.from ?? "");
      setDraftTo(cached.filter.to ?? "");
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem(tokenKey);
    if (!token) {
      window.location.replace("/profile/me");
      return;
    }

    setIsRefreshing(true);
    const query = new URLSearchParams({ rangePreset: appliedFilter.preset });
    if (appliedFilter.preset === "CUSTOM") {
      query.set("from", appliedFilter.from);
      query.set("to", appliedFilter.to);
    }

    void fetch(`${webEnv.apiUrl}/profile/me/dashboard?${query.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
      .then((response) => parseApiResponse<DashboardResponse>(response))
      .then((payload) => {
        writeDashboardCache(payload);
        setData(payload);
        setError(null);
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : "Could not load dashboard";
        if (message === "Invalid token" || message === "Missing bearer token") {
          localStorage.removeItem(tokenKey);
          clearDashboardCache();
          clearProfileSnapshotCache();
          window.location.replace("/profile/me");
          return;
        }

        setError(message);
      })
      .finally(() => setIsRefreshing(false));
  }, [appliedFilter]);

  const summary = useMemo(() => {
    if (!data) {
      return null;
    }

    const rate = data.rates[displayCurrency];
    const income = viewMode === "PERSONAL" ? data.summary.personalIncome : data.summary.totalIncome;
    const expense = viewMode === "PERSONAL" ? data.summary.personalExpense : data.summary.totalExpense;
    const balance = viewMode === "PERSONAL" ? data.summary.personalBalance : data.summary.balance;

    return {
      totalIncome: convertAmount(income, rate),
      totalExpense: convertAmount(expense, rate),
      balance: convertAmount(balance, rate)
    };
  }, [data, displayCurrency, viewMode]);

  useRouteTransitionPageReady(Boolean(data || error));

  if (!data && !error) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-3xl items-center justify-center px-5 py-16 sm:px-8">
        <Card className="panel-soft w-full max-w-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Loader2 className="size-5 animate-spin text-pop" />Loading dashboard</CardTitle>
            <CardDescription>Preparing the latest filtered balances and activity...</CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  if (!data || !summary) {
    return (
      <main className="container-shell pb-16 pt-24">
        <Card className="panel-soft border-red-300/20 bg-red-500/10 dark:border-red-400/30 dark:bg-red-500/10">
          <CardContent className="pt-6"><p className="status-error text-sm">{error}</p></CardContent>
        </Card>
      </main>
    );
  }

  const metricsHeading = viewMode === "PERSONAL" ? "Personal lens" : "Shared lens";
  const metricsDescription = viewMode === "PERSONAL" ? "See only your own income, expenses, and balance inside the currently selected range." : "See the combined workspace totals inside the currently selected range.";

  return (
    <main className="container-shell pb-16 pt-24">
      <header className="soft-rise mb-8 flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-4">
          <BrandMark href="/" />
          <div>
            <p className="eyebrow-row">Dashboard</p>
            <h1 className="mt-5 font-[family-name:var(--font-heading)] text-[clamp(38px,4vw,56px)] font-light leading-[1.08]">Filtered finance views with calendar-aware ranges.</h1>
            <p className="body-muted mt-3 text-sm">Workspace: {data.profile.activeCouple?.name ?? "Personal workspace"} · Active range: {data.filter.label}</p>
          </div>
        </div>
        <PageHeaderActions>
          {isRefreshing ? <span className="body-muted text-xs uppercase tracking-[0.16em]">Refreshing</span> : null}
          <Button variant="outline" asChild><AppLink href="/profile/me">Back to profile</AppLink></Button>
        </PageHeaderActions>
      </header>

      <section className="mb-6 flex flex-wrap items-end gap-3">
        <DashboardViewSelect value={viewMode} options={data.availableViews} onChange={setViewMode} />
        <label className="space-y-1 text-sm">
          <span className="field-label">Display currency</span>
          <SelectField value={displayCurrency} onChange={(event) => setDisplayCurrency(event.target.value as SupportedCurrency)} className="min-w-[112px]">
            {data.supportedCurrencies.map((item) => <option key={item} value={item}>{item}</option>)}
          </SelectField>
        </label>
      </section>

      <DashboardRangeFilter
        preset={selectedPreset}
        draftFrom={draftFrom}
        draftTo={draftTo}
        isRefreshing={isRefreshing}
        weekStartsOn={data.preferences.weekStartsOn}
        activeLabel={data.filter.label}
        activeFrom={formatDateLabel(data.filter.appliedFrom)}
        activeTo={formatDateLabel(data.filter.appliedTo)}
        onPresetChange={(preset) => {
          setSelectedPreset(preset);
          if (preset !== "CUSTOM") {
            setAppliedFilter({ preset, from: "", to: "" });
          }
        }}
        onDraftFromChange={setDraftFrom}
        onDraftToChange={setDraftTo}
        onApplyCustom={() => {
          setSelectedPreset("CUSTOM");
          setAppliedFilter({ preset: "CUSTOM", from: draftFrom, to: draftTo });
        }}
      />

      <DashboardMetrics heading={metricsHeading} description={metricsDescription} totalIncome={summary.totalIncome} totalExpense={summary.totalExpense} balance={summary.balance} currency={displayCurrency} />
      <DashboardRecents recent={data.recent} displayCurrency={displayCurrency} rates={data.rates} />
    </main>
  );
}
