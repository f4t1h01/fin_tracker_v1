"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { AppLink } from "@/components/navigation/app-link";
import { Button } from "@/components/ui/button";
import { webEnv } from "@/lib/env";

import { parseApiResponse } from "@/components/profile/api";
import { AuthShell } from "./auth-shell";
import { completeAuthSession, fetchAuthProviders, type AuthPayload } from "./auth-session";
import { GoogleIdentityButton } from "./google-identity-button";
import { GoogleMark } from "./google-mark";
import { useAuthPageRedirect } from "./use-auth-page-redirect";

export function AuthGooglePage() {
  const router = useRouter();
  const { isCheckingSession } = useAuthPageRedirect();
  const [clientId, setClientId] = useState<string | null>(null);
  const [isLoadingProvider, setIsLoadingProvider] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isCheckingSession) {
      return;
    }

    let isCancelled = false;
    setIsLoadingProvider(true);

    void fetchAuthProviders()
      .then((providers) => {
        if (!isCancelled) {
          setClientId(providers.google.isEnabled ? providers.google.clientId : null);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setClientId(null);
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoadingProvider(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [isCheckingSession]);

  const onCredential = useCallback(
    async (credential: string) => {
      setError(null);
      setIsSubmitting(true);

      try {
        const response = await fetch(`${webEnv.apiUrl}/auth/google/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ credential })
        });
        const payload = await parseApiResponse<AuthPayload>(response);
        await completeAuthSession(payload.accessToken, "google");
        router.replace("/profile/me");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not sign in with Google");
      } finally {
        setIsSubmitting(false);
      }
    },
    [router]
  );

  if (isCheckingSession) {
    return (
      <AuthShell eyebrow="Google access" title="Opening your workspace." description="Checking your saved session...">
        <p className="body-muted text-sm">Please wait.</p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Google access"
      title="Continue with Google."
      description="Duet will link your verified Google email to an existing account, or create a new account if needed."
      footer={<AppLink className="secondary-link" href="/auth">Back to sign in</AppLink>}
    >
      <div className="auth-step space-y-4">
        <div className="auth-choice auth-choice-google justify-center">
          <GoogleMark />
          <span>Login or sign up through Google</span>
        </div>
        {isLoadingProvider ? <p className="body-muted text-sm">Preparing Google sign-in...</p> : null}
        {!isLoadingProvider && clientId ? <GoogleIdentityButton clientId={clientId} onCredential={onCredential} /> : null}
        {!isLoadingProvider && !clientId ? <p className="status-error text-sm">Google sign-in is not enabled yet.</p> : null}
        {isSubmitting ? <p className="body-muted text-sm">Signing in...</p> : null}
        {error ? <p className="status-error text-sm">{error}</p> : null}
        <Button variant="outline" asChild>
          <AppLink href="/auth/check">Use email instead</AppLink>
        </Button>
      </div>
    </AuthShell>
  );
}
