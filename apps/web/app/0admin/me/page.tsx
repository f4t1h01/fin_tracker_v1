"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { BrandMark } from "@/components/marketing/brand-mark";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { webEnv } from "@/lib/env";

type Metrics = {
  users: number;
  couples: number;
  transactions: number;
  categories: number;
};

type AdminMe = {
  email: string;
};

const adminTokenKey = "cf_admin_token";

export default function AdminMePage() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [admin, setAdmin] = useState<AdminMe | null>(null);

  useEffect(() => {
    const token = localStorage.getItem(adminTokenKey);
    if (!token) {
      router.replace("/0admin/login");
      return;
    }

    void Promise.all([
      fetch(`${webEnv.apiUrl}/0admin/me`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }),
      fetch(`${webEnv.apiUrl}/0admin/metrics`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
    ])
      .then(async ([meResponse, metricsResponse]) => {
        if (meResponse.status === 401 || metricsResponse.status === 401) {
          localStorage.removeItem(adminTokenKey);
          router.replace("/0admin/login");
          return null;
        }

        if (!meResponse.ok || !metricsResponse.ok) {
          return null;
        }

        const [mePayload, metricsPayload] = await Promise.all([meResponse.json(), metricsResponse.json()]);
        return { mePayload: mePayload as AdminMe, metricsPayload: metricsPayload as Metrics };
      })
      .then((payload) => {
        if (!payload) {
          return;
        }

        setAdmin(payload.mePayload);
        setMetrics(payload.metricsPayload);
      })
      .catch(() => null);
  }, [router]);

  return (
    <main className="mx-auto max-w-5xl px-5 py-16 sm:px-8">
      <div className="soft-rise mb-6 space-y-4">
        <BrandMark href="/" />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="eyebrow-row">Operations</p>
            <h1 className="font-[family-name:var(--font-heading)] text-3xl">Admin workspace</h1>
            <p className="body-muted mt-2 text-sm">Signed in as {admin?.email ?? "..."}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              localStorage.removeItem(adminTokenKey);
              router.replace("/0admin/login");
            }}
          >
            Sign out
          </Button>
        </div>
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
