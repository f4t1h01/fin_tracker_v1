"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useRouteTransitionPageReady } from "@/components/navigation/route-transition-provider";
import { tokenKey } from "@/components/profile/types";

import { clearBrowserAuthSession, validateAuthToken } from "./auth-session";

export function useAuthPageRedirect() {
  const router = useRouter();
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useRouteTransitionPageReady(!isCheckingSession);

  useEffect(() => {
    const token = localStorage.getItem(tokenKey);

    if (!token) {
      setIsCheckingSession(false);
      return;
    }

    let isCancelled = false;

    void validateAuthToken(token)
      .then(() => {
        if (!isCancelled) {
          router.replace("/profile/me");
        }
      })
      .catch(() => {
        if (!isCancelled) {
          clearBrowserAuthSession();
          setIsCheckingSession(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [router]);

  return { isCheckingSession };
}
