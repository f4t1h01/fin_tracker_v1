"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { webEnv } from "@/lib/env";

type Metrics = {
  users: number;
  couples: number;
  transactions: number;
  categories: number;
};

export default function AdminPage() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<Metrics | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("cf_token");
    if (!token) {
      router.replace("/login");
      return;
    }

    void fetch(`${webEnv.apiUrl}/admin/metrics`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
      .then(async (res) => {
        if (res.status === 401) {
          localStorage.removeItem("cf_token");
          router.replace("/login");
          return null;
        }

        return res.ok ? res.json() : null;
      })
      .then((data) => {
        if (data) {
          setMetrics(data as Metrics);
        }
      })
      .catch(() => null);
  }, [router]);

  return (
    <main className="mx-auto max-w-5xl px-5 py-16 sm:px-8">
      <div className="soft-rise mb-6">
        <p className="eyebrow text-xs uppercase tracking-[0.2em]">Operations</p>
        <h1 className="font-[family-name:var(--font-heading)] text-3xl">Admin Panel</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Users</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{metrics?.users ?? "-"}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Couples</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{metrics?.couples ?? "-"}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Transactions</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{metrics?.transactions ?? "-"}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Categories</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{metrics?.categories ?? "-"}</CardContent>
        </Card>
      </div>
    </main>
  );
}
