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
    <main className="mx-auto max-w-5xl px-5 py-16 sm:px-8">
      <header className="soft-rise mb-8">
        <p className="eyebrow text-xs uppercase tracking-[0.2em]">Account access</p>
        <h1 className="font-[family-name:var(--font-heading)] text-3xl">Sign in to Couple Finance Tracker</h1>
        <p className="body-muted mt-2 max-w-2xl text-sm">
          Use email if you already created web credentials. Use Telegram for instant sign-in when you are coming from the bot.
        </p>
      </header>

      <section className="grid gap-5 lg:grid-cols-2">
        <Card className="panel-soft">
          <CardHeader>
            <CardTitle>Login with email</CardTitle>
            <CardDescription>Website login works independently once your account has email credentials.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={onSubmit}>
              <label className="space-y-1 text-sm">
                <span className="field-label">Email</span>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="form-input"
                />
              </label>

              <label className="space-y-1 text-sm">
                <span className="field-label">Password</span>
                <input
                  required
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Your password"
                  className="form-input"
                />
              </label>

              <div className="flex items-center gap-3">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Signing in..." : "Sign in"}
                </Button>
                {errorMessage ? <p className="status-error text-sm">{errorMessage}</p> : null}
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="panel-soft">
          <CardHeader>
            <CardTitle>Login with Telegram</CardTitle>
            <CardDescription>Fast sign-in using the Telegram widget when your bot session is available.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <TelegramLogin onSuccess={onTelegramSuccess} />
            <p className="body-muted text-sm">
              New here? You can start from Telegram with <code>/start</code> and <code>Open app</code>, then save email access in profile for future website logins.
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
