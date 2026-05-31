"use client";

import { UserPlus } from "lucide-react";
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

export function AuthCreatePage() {
  const router = useRouter();
  const { isCheckingSession } = useAuthPageRedirect();
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const queryEmail = new URLSearchParams(window.location.search).get("email");
    if (queryEmail) {
      setEmail(queryEmail);
    }
  }, []);

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

  return (
    <AuthShell eyebrow="Create account" title="Create your Duet account." description="Set up email and password access for your workspace." footer={<AppLink className="secondary-link" href="/auth/check">Back to email login</AppLink>}>
      <form className="auth-step space-y-3" onSubmit={createAccount}>
        <label className="space-y-1 text-sm">
          <span className="field-label">Name</span>
          <TextField value={firstName} onChange={(event) => setFirstName(event.target.value)} placeholder="Fatih" />
        </label>
        <label className="space-y-1 text-sm">
          <span className="field-label">Email</span>
          <TextField required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
        </label>
        <TextField required type="password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" />
        <TextField required type="password" minLength={8} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Repeat password" />
        <Button type="submit" className="w-full" disabled={isCreating} pending={isCreating} pendingText="Creating...">
          <UserPlus className="size-4" />
          Create account
        </Button>
        {message ? <p className="status-success text-sm">{message}</p> : null}
        {error ? <p className="status-error text-sm">{error}</p> : null}
      </form>
    </AuthShell>
  );
}
