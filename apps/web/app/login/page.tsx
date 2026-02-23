"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { TelegramLogin } from "@/components/telegram-login";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { webEnv } from "@/lib/env";

type PasswordLoginResponse = {
  accessToken: string;
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

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const onTelegramSuccess = useCallback(() => {
    router.replace("/profile");
  }, [router]);

  useEffect(() => {
    const token = localStorage.getItem("cf_token");
    if (token) {
      router.replace("/profile");
    }
  }, [router]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(`${webEnv.apiUrl}/auth/password/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email,
          password
        })
      });

      const payload = await parseApiResponse<PasswordLoginResponse>(response);
      localStorage.setItem("cf_token", payload.accessToken);
      router.replace("/profile");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not sign in";
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-[0.2em] text-white/60">Account access</p>
        <h1 className="font-[family-name:var(--font-heading)] text-3xl">Sign in to Couple Finance Tracker</h1>
      </header>

      <section className="grid gap-5 lg:grid-cols-2">
        <Card className="border-white/20 bg-white/10">
          <CardHeader>
            <CardTitle>Login with email</CardTitle>
            <CardDescription>Use credentials you created from Telegram web app onboarding.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={onSubmit}>
              <label className="space-y-1 text-sm">
                <span className="text-white/70">Email</span>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="h-10 w-full rounded-xl border border-white/20 bg-slate-900/50 px-3 text-white outline-none ring-pop focus:ring-2"
                />
              </label>

              <label className="space-y-1 text-sm">
                <span className="text-white/70">Password</span>
                <input
                  required
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Your password"
                  className="h-10 w-full rounded-xl border border-white/20 bg-slate-900/50 px-3 text-white outline-none ring-pop focus:ring-2"
                />
              </label>

              <div className="flex items-center gap-3">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Signing in..." : "Sign in"}
                </Button>
                {errorMessage ? <p className="text-sm text-rose-200">{errorMessage}</p> : null}
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="border-white/20 bg-white/10">
          <CardHeader>
            <CardTitle>Login with Telegram</CardTitle>
            <CardDescription>Fast sign-in using Telegram account verification widget.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <TelegramLogin onSuccess={onTelegramSuccess} />
            <p className="text-sm text-white/70">
              New here? Open the bot in Telegram, send <code>/start</code>, tap <code>Open app</code>, then set your email and password in profile.
            </p>
            <Button variant="outline" asChild>
              <Link href="/">Back to home</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
