"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { BrandMark } from "@/components/marketing/brand-mark";
import { useRouteTransitionPageReady } from "@/components/navigation/route-transition-provider";
import { adminFetch } from "@/components/admin/client";
import type { AdminSession } from "@/components/admin/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TextField } from "@/components/ui/text-field";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useRouteTransitionPageReady(true);

  useEffect(() => {
    void adminFetch<AdminSession>("/0admin/me")
      .then(() => {
        router.replace("/0admin");
      })
      .catch(() => null);
  }, [router]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await adminFetch("/0admin/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      router.replace("/0admin");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not sign in");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="container-shell pb-16 pt-24">
      <header className="soft-rise mb-8 space-y-4">
        <BrandMark href="/" />
        <div>
          <p className="eyebrow-row">Admin access</p>
          <h1 className="mt-5 font-[family-name:var(--font-heading)] text-[clamp(34px,4vw,52px)] font-light leading-[1.08]">Sign in to the operations workspace.</h1>
        </div>
      </header>

      <Card className="panel-soft mx-auto w-full max-w-xl">
        <CardHeader>
          <CardTitle>Admin login</CardTitle>
          <CardDescription>Cookie-backed session login for the back office.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={onSubmit}>
            <label className="space-y-1 text-sm">
              <span className="field-label">Email</span>
              <TextField required type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>

            <label className="space-y-1 text-sm">
              <span className="field-label">Password</span>
              <TextField required type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
            </label>

            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Signing in..." : "Sign in"}
              </Button>
              {errorMessage ? <p className="status-error text-sm">{errorMessage}</p> : null}
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
