"use client";

import { ArrowRight, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { AppLink } from "@/components/navigation/app-link";
import { parseApiResponse } from "@/components/profile/api";
import { webEnv } from "@/lib/env";

import { AuthShell } from "./auth-shell";
import { completeAuthSession, fetchAuthProviders, type AuthPayload } from "./auth-session";
import { GoogleIdentityButton } from "./google-identity-button";
import { useAuthPageRedirect } from "./use-auth-page-redirect";

export function AuthStartPage() {
  const router = useRouter();
  const { isCheckingSession } = useAuthPageRedirect();
  const [googleClientId, setGoogleClientId] = useState<string | null>(null);
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(true);
  const [isSubmittingGoogle, setIsSubmittingGoogle] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);

  useEffect(() => {
    if (isCheckingSession) {
      return;
    }

    let isCancelled = false;
    setIsLoadingGoogle(true);

    void fetchAuthProviders()
      .then((providers) => {
        if (!isCancelled) {
          setGoogleClientId(providers.google.isEnabled ? providers.google.clientId : null);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setGoogleClientId(null);
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoadingGoogle(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [isCheckingSession]);

  const onGoogleCredential = useCallback(
    async (credential: string) => {
      setGoogleError(null);
      setIsSubmittingGoogle(true);

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
      } catch (error) {
        setGoogleError(error instanceof Error ? error.message : "Could not sign in with Google");
      } finally {
        setIsSubmittingGoogle(false);
      }
    },
    [router]
  );

  if (isCheckingSession) {
    return (
      <AuthShell eyebrow="Duet access" title="Opening your workspace." description="Checking your saved session...">
        <p className="body-muted text-sm">Please wait.</p>
      </AuthShell>
    );
  }

  return (
    <AuthShell eyebrow="Duet access" title="Choose how to continue." description="Use Google for the fastest start, or continue with your email password.">
      <div className="auth-step space-y-3">
        {isLoadingGoogle ? <div className="auth-choice">Preparing Google sign-in...</div> : null}
        {!isLoadingGoogle && googleClientId ? <GoogleIdentityButton clientId={googleClientId} onCredential={onGoogleCredential} /> : null}
        {!isLoadingGoogle && !googleClientId ? <div className="auth-choice">Google sign-in is not enabled yet</div> : null}
        {isSubmittingGoogle ? <p className="body-muted text-sm">Signing in with Google...</p> : null}
        {googleError ? <p className="status-error text-sm">{googleError}</p> : null}
        <AppLink href="/auth/check" className="auth-choice">
          <Mail className="size-5 text-[var(--gold)]" />
          <span>Login through email</span>
          <ArrowRight className="ml-auto size-4" />
        </AppLink>
      </div>
    </AuthShell>
  );
}
