"use client";

import { useEffect, useState } from "react";

import { BrandMark } from "@/components/marketing/brand-mark";
import { AppLink } from "@/components/navigation/app-link";
import { useRouteTransitionPageReady } from "@/components/navigation/route-transition-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { webEnv } from "@/lib/env";

type AuthMeResponse = {
  email: string | null;
  hasPassword: boolean;
  firstName: string | null;
  username: string | null;
  isDark: boolean;
};

const tokenKey = "cf_token";

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

export default function ProfileEntryPage() {
  const [auth, setAuth] = useState<AuthMeResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useRouteTransitionPageReady(!isLoading);

  useEffect(() => {
    const token = localStorage.getItem(tokenKey);

    if (!token) {
      setIsLoading(false);
      return;
    }

    void fetch(`${webEnv.apiUrl}/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
      .then((response) => parseApiResponse<AuthMeResponse>(response))
      .then((payload) => setAuth(payload))
      .catch(() => {
        localStorage.removeItem(tokenKey);
        setAuth(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const warmName = auth?.firstName ?? auth?.username ?? null;

  return (
    <main className="container-shell pb-16 pt-24">
      <header className="soft-rise mb-8 flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-4">
          <BrandMark href="/" />
          <div>
            <p className="eyebrow-row">Profile gateway</p>
            <h1 className="mt-5 font-[family-name:var(--font-heading)] text-[clamp(38px,4vw,56px)] font-light leading-[1.08]">
              {warmName ? `Good day, ${warmName}` : "Good day"}
            </h1>
          </div>
        </div>
        <ThemeToggle />
      </header>

      <Card className="panel-soft mx-auto w-full max-w-3xl">
        <CardHeader>
          <CardTitle>{isLoading ? "Checking your session" : auth ? "You are signed in" : "You are not signed in"}</CardTitle>
          <CardDescription>{isLoading ? "Checking saved session..." : auth ? "Open your workspace." : "Sign in or register."}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {auth ? (
            <div className="detail-box space-y-2 text-sm">
              <p>Display name: {warmName ?? "Not set yet"}</p>
              <p>Email login: {auth.hasPassword ? auth.email ?? "Ready" : "Not saved yet"}</p>
              <p>Theme: {auth.isDark ? "Dark" : "Light"}</p>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <Button asChild>
              <AppLink href={auth ? "/profile/me" : "/auth"}>{auth ? "Open my workspace" : "Continue to sign in"}</AppLink>
            </Button>
            <Button variant="outline" asChild>
              <AppLink href="/">Back to overview</AppLink>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
