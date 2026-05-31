"use client";

import { ArrowLeft, ArrowRight, Lock, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { AppLink } from "@/components/navigation/app-link";
import { ApiResponseError, parseApiResponse } from "@/components/profile/api";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { webEnv } from "@/lib/env";

import { AuthShell } from "./auth-shell";
import { completeAuthSession, type AuthPayload } from "./auth-session";
import { useAuthPageRedirect } from "./use-auth-page-redirect";

type EmailCheckResponse =
  | {
      status: "EXISTS";
    }
  | {
      status: "NOT_FOUND";
      attemptsRemaining: number;
      retryAfterSeconds?: number;
    };

type EmailStep = "email" | "password" | "missing";

export function AuthCheckPage() {
  const router = useRouter();
  const { isCheckingSession } = useAuthPageRedirect();
  const [step, setStep] = useState<EmailStep>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);
  const [lockSeconds, setLockSeconds] = useState(0);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const queryEmail = new URLSearchParams(window.location.search).get("email");
    if (queryEmail) {
      setEmail(queryEmail);
    }
  }, []);

  useEffect(() => {
    if (lockSeconds <= 0) {
      return;
    }

    const interval = window.setInterval(() => {
      setLockSeconds((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [lockSeconds]);

  const isLocked = lockSeconds > 0;
  const normalizedEmail = useMemo(() => email.trim(), [email]);

  const checkEmail = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!normalizedEmail || isLocked) {
      return;
    }

    setError(null);
    setMessage(null);
    setIsCheckingEmail(true);

    try {
      const response = await fetch(`${webEnv.apiUrl}/auth/email/check`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email: normalizedEmail })
      });
      const payload = await parseApiResponse<EmailCheckResponse>(response);

      if (payload.status === "EXISTS") {
        setStep("password");
        setPassword("");
        setAttemptsRemaining(null);
        setMessage("Email found.");
        return;
      }

      setStep("missing");
      setAttemptsRemaining(payload.attemptsRemaining);
      if (payload.retryAfterSeconds) {
        setLockSeconds(payload.retryAfterSeconds);
      }
      setMessage(payload.attemptsRemaining > 0 ? `${payload.attemptsRemaining} attempts left.` : "Try again after the timeout.");
    } catch (err) {
      const retryAfterSeconds = readRetryAfterSeconds(err);
      if (retryAfterSeconds) {
        setLockSeconds(retryAfterSeconds);
        setError(`Try again in ${retryAfterSeconds}s.`);
      } else {
        setError(err instanceof Error ? err.message : "Could not check email");
      }
    } finally {
      setIsCheckingEmail(false);
    }
  };

  const loginWithPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!normalizedEmail || !password) {
      return;
    }

    setError(null);
    setMessage(null);
    setIsSubmittingPassword(true);

    try {
      const response = await fetch(`${webEnv.apiUrl}/auth/password/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email: normalizedEmail, password })
      });
      const payload = await parseApiResponse<AuthPayload>(response);
      await completeAuthSession(payload.accessToken, "website");
      router.replace("/profile/me");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in");
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  if (isCheckingSession) {
    return (
      <AuthShell eyebrow="Email access" title="Opening your workspace." description="Checking your saved session...">
        <p className="body-muted text-sm">Please wait.</p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Email access"
      title={step === "password" ? "Enter your password." : "Enter your email."}
      description={step === "missing" ? "No account was found for this email." : "Use the email saved on your Duet account."}
      footer={<AppLink className="secondary-link" href="/auth">Back to sign in</AppLink>}
    >
      <div className="auth-step space-y-4">
        {step === "email" || step === "missing" ? (
          <form className="space-y-3" onSubmit={checkEmail}>
            <label className="space-y-1 text-sm">
              <span className="field-label">Email</span>
              <TextField required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" disabled={isLocked} />
            </label>
            <Button type="submit" className="w-full" disabled={isCheckingEmail || isLocked} pending={isCheckingEmail} pendingText="Checking...">
              {isLocked ? `Try again in ${lockSeconds}s` : "Continue"}
              {!isLocked ? <ArrowRight className="size-4" /> : null}
            </Button>
          </form>
        ) : null}

        {step === "password" ? (
          <form className="space-y-3" onSubmit={loginWithPassword}>
            <div className="detail-box flex items-center gap-3 text-sm">
              <Mail className="size-4 text-[var(--gold)]" />
              <span>{normalizedEmail}</span>
            </div>
            <label className="space-y-1 text-sm">
              <span className="field-label">Password</span>
              <TextField required type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Your password" />
            </label>
            <Button type="submit" className="w-full" disabled={isSubmittingPassword} pending={isSubmittingPassword} pendingText="Signing in...">
              <Lock className="size-4" />
              Sign in
            </Button>
          </form>
        ) : null}

        {step === "missing" ? (
          <div className="space-y-3">
            <div className="detail-box space-y-1 text-sm">
              <p>No account exists for {normalizedEmail}.</p>
              {attemptsRemaining !== null ? <p className="body-muted">{attemptsRemaining > 0 ? `${attemptsRemaining} attempts left.` : `Try again in ${lockSeconds}s.`}</p> : null}
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <AppLink href={`/auth/create?email=${encodeURIComponent(normalizedEmail)}`}>Create account</AppLink>
              </Button>
              <Button type="button" variant="outline" onClick={() => {
                setStep("email");
                setEmail("");
                setError(null);
                setMessage(null);
              }}>
                <ArrowLeft className="size-4" />
                Try another email
              </Button>
            </div>
          </div>
        ) : null}

        {step === "password" ? (
          <AppLink className="secondary-link text-sm" href={`/auth/reset?email=${encodeURIComponent(normalizedEmail)}`}>
            Reset password
          </AppLink>
        ) : null}
        {message ? <p className="status-success text-sm">{message}</p> : null}
        {error ? <p className="status-error text-sm">{error}</p> : null}
      </div>
    </AuthShell>
  );
}

function readRetryAfterSeconds(error: unknown) {
  if (!(error instanceof ApiResponseError) || error.status !== 429) {
    return null;
  }

  const retryAfterSeconds = (error.payload as { retryAfterSeconds?: unknown })?.retryAfterSeconds;
  return typeof retryAfterSeconds === "number" && Number.isFinite(retryAfterSeconds) ? retryAfterSeconds : null;
}
