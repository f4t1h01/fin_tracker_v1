"use client";

import { ArrowRight, Mail } from "lucide-react";

import { AppLink } from "@/components/navigation/app-link";

import { AuthShell } from "./auth-shell";
import { GoogleMark } from "./google-mark";
import { useAuthPageRedirect } from "./use-auth-page-redirect";

export function AuthStartPage() {
  const { isCheckingSession } = useAuthPageRedirect();

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
        <AppLink href="/auth/google" className="auth-choice auth-choice-google">
          <GoogleMark />
          <span>Login or sign up through Google</span>
          <ArrowRight className="ml-auto size-4" />
        </AppLink>
        <AppLink href="/auth/check" className="auth-choice">
          <Mail className="size-5 text-[var(--gold)]" />
          <span>Login through email</span>
          <ArrowRight className="ml-auto size-4" />
        </AppLink>
      </div>
    </AuthShell>
  );
}
