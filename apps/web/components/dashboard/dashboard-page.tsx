"use client";

import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

import { BrandMark } from "@/components/marketing/brand-mark";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { webEnv } from "@/lib/env";

import { parseApiResponse } from "@/components/profile/api";
import { clearDashboardCache, clearProfileSnapshotCache, readDashboardCache, writeDashboardCache } from "@/components/profile/cache";
import { DashboardResponse, tokenKey, type SupportedCurrency } from "@/components/profile/types";

import { DashboardMetrics } from "./dashboard-metrics";
import { DashboardRecents } from "./dashboard-recents";

const useClientLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

function convertAmount(amountInUzs: number, rate: number) {
  if (rate <= 0) {
    return 0;
  }

  return Number((amountInUzs / rate).toFixed(2));
}

export function DashboardPage() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [displayCurrency, setDisplayCurrency] = useState<SupportedCurrency>("UZS");
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useClientLayoutEffect(() => {
    const cached = readDashboardCache();
    if (cached) {
      setData(cached);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem(tokenKey);
    if (!token) {
      window.location.replace("/profile/me");
      return;
    }

    setIsRefreshing(true);
    void fetch(`${webEnv.apiUrl}/profile/me/dashboard`, {
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
  }, []);

  const summary = useMemo(() => {
    if (!data) {
      return null;
    }

    const rate = data.rates[displayCurrency];
    return {
      totalIncome: convertAmount(data.summary.totalIncome, rate),
      totalExpense: convertAmount(data.summary.totalExpense, rate),
      balance: convertAmount(data.summary.balance, rate)
    };
  }, [data, displayCurrency]);

  if (!data && !error) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-3xl items-center justify-center px-5 py-16 sm:px-8">
        <Card className="panel-soft w-full max-w-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Loader2 className="size-5 animate-spin text-pop" />Loading dashboard</CardTitle>
            <CardDescription>Preparing current-month converted balances...</CardDescription>
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

  return (
    <main className="container-shell pb-16 pt-24">
      <header className="soft-rise mb-8 flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-4">
          <BrandMark href="/" />
          <div>
            <p className="eyebrow-row">Dashboard</p>
            <h1 className="mt-5 font-[family-name:var(--font-heading)] text-[clamp(38px,4vw,56px)] font-light leading-[1.08]">Current month in any supported currency.</h1>
            <p className="body-muted mt-3 text-sm">Workspace: {data.profile.activeCouple?.name ?? "Personal workspace"} · Code: {data.profile.user.coupleCode}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <label className="space-y-1 text-sm">
            <span className="field-label">Display currency</span>
            <select value={displayCurrency} onChange={(event) => setDisplayCurrency(event.target.value as SupportedCurrency)} className="form-select min-w-[112px]">
              {data.supportedCurrencies.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          {isRefreshing ? <span className="body-muted text-xs uppercase tracking-[0.16em]">Refreshing</span> : null}
          <Button variant="outline" asChild><a href="/profile/me">Back to profile</a></Button>
        </div>
      </header>

      <DashboardMetrics totalIncome={summary.totalIncome} totalExpense={summary.totalExpense} balance={summary.balance} currency={displayCurrency} />
      <DashboardRecents recent={data.recent} displayCurrency={displayCurrency} rates={data.rates} />
    </main>
  );
}
