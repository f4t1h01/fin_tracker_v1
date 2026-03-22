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
import {
  DashboardResponse,
  tokenKey,
  type DashboardActor,
  type DashboardKind,
  type DashboardRangePreset,
  type DashboardViewMode,
  type SupportedCurrency
} from "@/components/profile/types";

import { DashboardAdvancedFilters } from "./dashboard-advanced-filters";
import { DashboardCharts } from "./dashboard-charts";
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
  const [draftFrom, setDraftFrom] = useState("");
  const [draftTo, setDraftTo] = useState("");
  const [draftMonthKey, setDraftMonthKey] = useState("");
  const [kind, setKind] = useState<DashboardKind>("ALL");
  const [categoryId, setCategoryId] = useState("");
  const [actor, setActor] = useState<DashboardActor>("EVERYONE");
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [timeFrom, setTimeFrom] = useState("");
  const [timeTo, setTimeTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useClientLayoutEffect(() => {
    const cached = readDashboardCache();
    if (!cached || !("transactions" in cached) || !("charts" in cached) || !("filters" in cached)) {
      return;
    }

    setData(cached);
    setDisplayCurrency("UZS");
    setViewMode(cached.filter.viewMode ?? "COUPLE");
    setSelectedPreset(cached.filter.preset);
    setDraftFrom(cached.filter.from ?? "");
    setDraftTo(cached.filter.to ?? "");
    setDraftMonthKey(cached.filter.monthKey ?? "");
    setKind(cached.filter.kind ?? "ALL");
    setCategoryId(cached.filter.categoryId ?? "");
    setActor(cached.filter.actor ?? "EVERYONE");
    setSearchDraft(cached.filter.search ?? "");
    setSearch(cached.filter.search ?? "");
    setTimeFrom(cached.filter.timeFrom ?? "");
    setTimeTo(cached.filter.timeTo ?? "");
    setPage(cached.filter.page ?? 1);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchDraft.trim());
      setPage(1);
    }, 500);

    return () => window.clearTimeout(timer);
  }, [searchDraft]);

  useEffect(() => {
    if ((selectedPreset === "CUSTOM" && (!draftFrom || !draftTo)) || (selectedPreset === "SPECIFIC_MONTH" && !draftMonthKey)) {
      return;
    }

    const token = localStorage.getItem(tokenKey);
    if (!token) {
      window.location.replace("/profile/me");
      return;
    }

    const query = new URLSearchParams({
      viewMode,
      page: String(page),
      pageSize: String(pageSize),
      rangePreset: selectedPreset
    });

    if (selectedPreset === "CUSTOM") {
      query.set("from", draftFrom);
      query.set("to", draftTo);
    }

    if (selectedPreset === "SPECIFIC_MONTH" && draftMonthKey) {
      query.set("monthKey", draftMonthKey);
    }

    if (kind !== "ALL") {
      query.set("kind", kind);
    }

    if (categoryId) {
      query.set("categoryId", categoryId);
    }

    if (actor !== "EVERYONE") {
      query.set("actor", actor);
    }

    if (search) {
      query.set("search", search);
    }

    if (timeFrom) {
      query.set("timeFrom", timeFrom);
    }

    if (timeTo) {
      query.set("timeTo", timeTo);
    }

    setIsRefreshing(true);
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
        setViewMode(payload.filter.viewMode);
        setSelectedPreset(payload.filter.preset);
        setDraftFrom(payload.filter.from ?? "");
        setDraftTo(payload.filter.to ?? "");
        setDraftMonthKey(payload.filter.monthKey ?? "");
        setKind(payload.filter.kind);
        setCategoryId(payload.filter.categoryId ?? "");
        setActor(payload.filter.actor);
        setSearchDraft(payload.filter.search);
        setSearch(payload.filter.search);
        setTimeFrom(payload.filter.timeFrom ?? "");
        setTimeTo(payload.filter.timeTo ?? "");
        setPage(payload.filter.page);
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
  }, [actor, categoryId, draftFrom, draftMonthKey, draftTo, kind, page, pageSize, search, selectedPreset, timeFrom, timeTo, viewMode]);

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
  const metricsDescription = viewMode === "PERSONAL" ? "See only your own income, expenses, and balance inside the selected range." : "See the combined workspace totals inside the selected range.";

  return (
    <main className="container-shell pb-16 pt-24">
      <header className="soft-rise mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-4xl space-y-4">
          <BrandMark href="/" />
          <div>
            <p className="eyebrow-row">Dashboard</p>
            <h1 className="mt-5 font-[family-name:var(--font-heading)] text-[clamp(38px,4vw,56px)] font-light leading-[1.08]">Filtered finance views.</h1>
            <p className="body-muted mt-3 text-sm">Workspace: {data.profile.activeCouple?.name ?? "Personal workspace"} · Active range: {data.filter.label}</p>
          </div>
        </div>
        <PageHeaderActions>
          {isRefreshing ? <span className="body-muted text-xs uppercase tracking-[0.16em]">Refreshing</span> : null}
          <Button variant="outline" asChild><AppLink href="/profile/me">Back to profile</AppLink></Button>
        </PageHeaderActions>
      </header>

      <section className="mb-6 flex flex-wrap items-end gap-3">
        <DashboardViewSelect value={viewMode} options={data.availableViews} onChange={(value) => { setViewMode(value); setPage(1); }} />
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
        draftMonthKey={draftMonthKey}
        isRefreshing={isRefreshing}
        weekStartsOn={data.filters.weekStartsOn}
        activeLabel={data.filter.label}
        activeFrom={formatDateLabel(data.filter.appliedFrom)}
        activeTo={formatDateLabel(data.filter.appliedTo)}
        onPresetChange={(preset) => {
          setSelectedPreset(preset);
          setPage(1);
          if (preset !== "CUSTOM") {
            setDraftFrom("");
            setDraftTo("");
          }
          if (preset !== "SPECIFIC_MONTH") {
            setDraftMonthKey("");
          }
        }}
        onDraftFromChange={(value) => {
          setDraftFrom(value);
          setPage(1);
        }}
        onDraftToChange={(value) => {
          setDraftTo(value);
          setPage(1);
        }}
        onDraftMonthKeyChange={(value) => {
          setDraftMonthKey(value);
          setPage(1);
        }}
        onApplyCustom={() => {
          setSelectedPreset("CUSTOM");
          setPage(1);
        }}
        onApplyMonth={() => {
          setSelectedPreset("SPECIFIC_MONTH");
          setPage(1);
        }}
      />

      <DashboardAdvancedFilters
        categoryCatalog={data.filters.categories}
        viewMode={viewMode}
        kind={kind}
        categoryId={categoryId}
        actor={actor}
        searchDraft={searchDraft}
        timeFrom={timeFrom}
        timeTo={timeTo}
        onKindChange={(value) => {
          setKind(value);
          setPage(1);
        }}
        onCategoryChange={(value) => {
          setCategoryId(value);
          setPage(1);
        }}
        onActorChange={(value) => {
          setActor(value);
          setPage(1);
        }}
        onSearchDraftChange={(value) => {
          setSearchDraft(value);
          setPage(1);
        }}
        onTimeFromChange={(value) => {
          setTimeFrom(value);
          setPage(1);
        }}
        onTimeToChange={(value) => {
          setTimeTo(value);
          setPage(1);
        }}
      />

      <DashboardMetrics heading={metricsHeading} description={metricsDescription} totalIncome={summary.totalIncome} totalExpense={summary.totalExpense} balance={summary.balance} currency={displayCurrency} />
      <DashboardCharts charts={data.charts} displayCurrency={displayCurrency} rates={data.rates} />
      <DashboardRecents
        transactions={data.transactions}
        displayCurrency={displayCurrency}
        rates={data.rates}
        onPageChange={(value) => setPage(value)}
      />
    </main>
  );
}
