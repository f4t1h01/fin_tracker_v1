"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

import { BrandMark } from "@/components/marketing/brand-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { webEnv } from "@/lib/env";

const tokenKey = "cf_token";

type SupportedCurrency = "UZS" | "USD" | "EUR" | "RUB";

type DashboardResponse = {
  profile: {
    user: {
      coupleCode: string;
    };
    activeCouple: {
      name: string;
    } | null;
  };
  summary: {
    month: number;
    year: number;
    currency: "UZS";
    totalIncome: number;
    totalExpense: number;
    balance: number;
  };
  recent: Array<{
    id: string;
    kind: "EXPENSE" | "INCOME";
    amount: number | string;
    amountInUzs: number | string;
    currency: SupportedCurrency;
    note: string | null;
    happenedAt: string;
    category: { name: string };
    user: { firstName: string | null; username: string | null };
  }>;
  rates: Record<SupportedCurrency, number>;
  supportedCurrencies: SupportedCurrency[];
};

async function parseApiResponse<T>(response: Response): Promise<T> {
  if (response.ok) {
    return (await response.json()) as T;
  }

  let errorMessage = `Request failed with status ${response.status}`;

  try {
    const payload = (await response.json()) as { message?: string | string[] };
    if (Array.isArray(payload.message)) {
      errorMessage = payload.message.join(", ");
    } else if (payload.message) {
      errorMessage = payload.message;
    }
  } catch {}

  throw new Error(errorMessage);
}

function convertAmount(amountInUzs: number, rate: number) {
  if (rate <= 0) {
    return 0;
  }

  return Number((amountInUzs / rate).toFixed(2));
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [displayCurrency, setDisplayCurrency] = useState<SupportedCurrency>("UZS");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem(tokenKey);

    if (!token) {
      window.location.replace("/profile/me");
      return;
    }

    void fetch(`${webEnv.apiUrl}/profile/me/dashboard`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
      .then((response) => parseApiResponse<DashboardResponse>(response))
      .then((payload) => setData(payload))
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load dashboard"));
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

  if (!data) {
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
          <ThemeToggle />
          <Button variant="outline" asChild><a href="/profile/me">Back to profile</a></Button>
        </div>
      </header>

      <section className="mb-6 grid gap-4 md:grid-cols-3">
        <Card className="metric-income"><CardHeader><CardTitle>Income</CardTitle></CardHeader><CardContent className="text-2xl font-semibold text-emerald-700 dark:text-emerald-200">{summary?.totalIncome.toLocaleString()} {displayCurrency}</CardContent></Card>
        <Card className="metric-expense"><CardHeader><CardTitle>Expense</CardTitle></CardHeader><CardContent className="text-2xl font-semibold text-rose-700 dark:text-rose-200">{summary?.totalExpense.toLocaleString()} {displayCurrency}</CardContent></Card>
        <Card className="metric-balance"><CardHeader><CardTitle>Balance</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{summary?.balance.toLocaleString()} {displayCurrency}</CardContent></Card>
      </section>

      <Card className="panel-soft">
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
          <CardDescription>Stored in original currency, displayed here in your selected dashboard currency.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.recent.map((item) => {
            const actor = item.user.firstName ?? item.user.username ?? "Member";
            const converted = convertAmount(Number(item.amountInUzs), data.rates[displayCurrency]);
            return (
              <div key={item.id} className="detail-box px-3 py-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{item.category.name}</p>
                    <p className="body-muted text-xs">{actor} - {item.note ?? "No note"} - {new Date(item.happenedAt).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{converted.toLocaleString()} {displayCurrency}</p>
                    <p className="body-muted text-xs">Original: {Number(item.amount).toLocaleString()} {item.currency}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </main>
  );
}
