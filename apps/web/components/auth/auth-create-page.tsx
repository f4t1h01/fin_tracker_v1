"use client";

import { MailCheck, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { AppLink } from "@/components/navigation/app-link";
import { parseApiResponse } from "@/components/profile/api";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { webEnv } from "@/lib/env";

import { AuthShell } from "./auth-shell";
import { completeAuthSession, type AuthPayload } from "./auth-session";
import { useAuthPageRedirect } from "./use-auth-page-redirect";

/**
 * Registration is two steps: confirm the email with a one-time code, then set the
 * password. The code is what proves the address belongs to whoever is signing up,
 * so nobody can register (or block) an email they do not control.
 */
type CreateStep = "REQUEST_CODE" | "CONFIRM";

export function AuthCreatePage() {
  const router = useRouter();
  const { isCheckingSession } = useAuthPageRedirect();
  const [step, setStep] = useState<CreateStep>("REQUEST_CODE");
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const queryEmail = new URLSearchParams(window.location.search).get("email");
    if (queryEmail) {
      setEmail(queryEmail);
    }
  }, []);

  const requestCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsSendingCode(true);

    try {
      const response = await fetch(`${webEnv.apiUrl}/auth/register/request-code`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email })
      });
      await parseApiResponse<{ ok: boolean; expiresInMinutes: number }>(response);
      setStep("CONFIRM");
      setMessage(`We sent a 6-digit code to ${email}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the confirmation code");
    } finally {
      setIsSendingCode(false);
    }
  };

  const resendCode = async () => {
    setError(null);
    setMessage(null);
    setIsSendingCode(true);

    try {
      const response = await fetch(`${webEnv.apiUrl}/auth/register/request-code`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email })
      });
      await parseApiResponse<{ ok: boolean }>(response);
      setMessage(`We sent a new code to ${email}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resend the confirmation code");
    } finally {
      setIsSendingCode(false);
    }
  };

  const createAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsCreating(true);

    try {
      const response = await fetch(`${webEnv.apiUrl}/auth/password/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          firstName: firstName || undefined,
          email,
          code,
          password
        })
      });
      const payload = await parseApiResponse<AuthPayload>(response);
      await completeAuthSession(payload.accessToken, "website");
      setMessage("Account created.");
      router.replace("/profile/me");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create account");
    } finally {
      setIsCreating(false);
    }
  };

  if (isCheckingSession) {
    return (
      <AuthShell eyebrow="Create account" title="Opening your workspace." description="Checking your saved session...">
        <p className="body-muted text-sm">Please wait.</p>
      </AuthShell>
    );
  }

  if (step === "REQUEST_CODE") {
    return (
      <AuthShell
        eyebrow="Create account"
        title="Confirm your email."
        description="We send a one-time code so we know the address is yours."
        footer={<AppLink className="secondary-link" href="/auth/check">Back to email login</AppLink>}
      >
        <form className="auth-step space-y-3" onSubmit={requestCode}>
          <label className="space-y-1 text-sm">
            <span className="field-label">Email</span>
            <TextField
              required
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
            />
          </label>
          <Button type="submit" className="w-full" disabled={isSendingCode} pending={isSendingCode} pendingText="Sending...">
            <MailCheck className="size-4" />
            Send confirmation code
          </Button>
          {message ? <p className="status-success text-sm">{message}</p> : null}
          {error ? <p className="status-error text-sm">{error}</p> : null}
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Create account"
      title="Finish your Duet account."
      description={`Enter the code we sent to ${email}, then choose a password.`}
      footer={
        <button type="button" className="secondary-link" onClick={() => setStep("REQUEST_CODE")}>
          Use a different email
        </button>
      }
    >
      <form className="auth-step space-y-3" onSubmit={createAccount}>
        <label className="space-y-1 text-sm">
          <span className="field-label">Confirmation code</span>
          <TextField
            required
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            minLength={6}
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
            placeholder="6-digit code"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="field-label">Name</span>
          <TextField value={firstName} onChange={(event) => setFirstName(event.target.value)} placeholder="Fatih" />
        </label>
        <TextField
          required
          type="password"
          autoComplete="new-password"
          minLength={8}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="At least 8 characters"
        />
        <TextField
          required
          type="password"
          autoComplete="new-password"
          minLength={8}
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="Repeat password"
        />
        <Button type="submit" className="w-full" disabled={isCreating} pending={isCreating} pendingText="Creating...">
          <UserPlus className="size-4" />
          Create account
        </Button>
        <Button type="button" variant="outline" className="w-full" disabled={isSendingCode} onClick={resendCode}>
          Resend code
        </Button>
        {message ? <p className="status-success text-sm">{message}</p> : null}
        {error ? <p className="status-error text-sm">{error}</p> : null}
      </form>
    </AuthShell>
  );
}
