"use client";

import { CheckCircle2, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";

import { AppLink } from "@/components/navigation/app-link";
import { parseApiResponse } from "@/components/profile/api";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { webEnv } from "@/lib/env";

import { AuthShell } from "./auth-shell";
import { completeAuthSession, type AuthPayload } from "./auth-session";
import { useAuthPageRedirect } from "./use-auth-page-redirect";

export function AuthResetPage() {
  const router = useRouter();
  const redirectTimerRef = useRef<number | null>(null);
  const { isCheckingSession } = useAuthPageRedirect();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [isRequestingCode, setIsRequestingCode] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const queryEmail = new URLSearchParams(window.location.search).get("email");
    if (queryEmail) {
      setEmail(queryEmail);
    }

    return () => {
      if (redirectTimerRef.current !== null) {
        window.clearTimeout(redirectTimerRef.current);
      }
    };
  }, []);

  const requestCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsRequestingCode(true);

    try {
      const response = await fetch(`${webEnv.apiUrl}/auth/password/reset/request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email })
      });
      const payload = await parseApiResponse<{ message: string }>(response);
      setIsCodeSent(true);
      setMessage(payload.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send reset code");
    } finally {
      setIsRequestingCode(false);
    }
  };

  const confirmReset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsResetting(true);

    try {
      const response = await fetch(`${webEnv.apiUrl}/auth/password/reset/confirm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, code, newPassword })
      });
      const payload = await parseApiResponse<AuthPayload>(response);
      await completeAuthSession(payload.accessToken, "website");
      setMessage("Password updated.");
      redirectTimerRef.current = window.setTimeout(() => router.replace("/profile/me"), 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update password");
    } finally {
      setIsResetting(false);
    }
  };

  if (isCheckingSession) {
    return (
      <AuthShell eyebrow="Password reset" title="Opening your workspace." description="Checking your saved session...">
        <p className="body-muted text-sm">Please wait.</p>
      </AuthShell>
    );
  }

  return (
    <AuthShell eyebrow="Password reset" title="Reset your password." description="Use the code sent to your email, then choose a new password." footer={<AppLink className="secondary-link" href="/auth/check">Back to email login</AppLink>}>
      <div className="auth-step space-y-4">
        {!isCodeSent ? (
          <form className="space-y-3" onSubmit={requestCode}>
            <label className="space-y-1 text-sm">
              <span className="field-label">Email</span>
              <TextField required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
            </label>
            <Button type="submit" className="w-full" disabled={isRequestingCode} pending={isRequestingCode} pendingText="Sending...">
              <Mail className="size-4" />
              Send reset code
            </Button>
          </form>
        ) : (
          <form className="space-y-3" onSubmit={confirmReset}>
            <div className="detail-box flex items-center gap-3 text-sm">
              <Mail className="size-4 text-[var(--gold)]" />
              <span>{email}</span>
            </div>
            <TextField required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(event) => setCode(event.target.value)} placeholder="6-digit code" />
            <TextField required type="password" minLength={8} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="New password" />
            <TextField required type="password" minLength={8} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Repeat new password" />
            <Button type="submit" className="w-full" disabled={isResetting} pending={isResetting} pendingText="Updating...">
              <CheckCircle2 className="size-4" />
              Update password
            </Button>
          </form>
        )}
        {message ? <p className="status-success text-sm">{message}</p> : null}
        {error ? <p className="status-error text-sm">{error}</p> : null}
      </div>
    </AuthShell>
  );
}
