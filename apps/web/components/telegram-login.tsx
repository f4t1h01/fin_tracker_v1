"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { webEnv } from "@/lib/env";

type TelegramUser = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
};

declare global {
  interface Window {
    onTelegramAuth?: (user: TelegramUser) => Promise<void>;
  }
}

type TelegramLoginProps = {
  onSuccess?: () => void;
};

export function TelegramLogin({ onSuccess }: TelegramLoginProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const widgetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!webEnv.botName || !widgetRef.current) {
      return;
    }

    window.onTelegramAuth = async (user: TelegramUser) => {
      setStatus("loading");
      try {
        const response = await fetch(`${webEnv.apiUrl}/auth/telegram`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(user)
        });

        if (!response.ok) {
          throw new Error("Login failed");
        }

        const data = (await response.json()) as { accessToken: string };
        localStorage.setItem("cf_token", data.accessToken);
        setStatus("done");
        onSuccess?.();
      } catch {
        setStatus("error");
      }
    };

    const script = document.createElement("script");
    script.async = true;
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.setAttribute("data-telegram-login", webEnv.botName);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-radius", "12");
    script.setAttribute("data-request-access", "write");
    script.setAttribute("data-onauth", "onTelegramAuth(user)");
    widgetRef.current.appendChild(script);

    return () => {
      if (widgetRef.current) {
        widgetRef.current.innerHTML = "";
      }
      window.onTelegramAuth = undefined;
    };
  }, [onSuccess]);

  if (!webEnv.botName) {
    return (
      <Button variant="outline" asChild>
        <a href="#setup">Set bot username in env</a>
      </Button>
    );
  }

  return (
    <div className="space-y-3">
      <div ref={widgetRef} />
      <p className="text-sm text-white/70">
        {status === "idle" && "Login using your Telegram account."}
        {status === "loading" && "Verifying Telegram account..."}
        {status === "done" && "Done. Redirecting to your profile..."}
        {status === "error" && "Failed to authenticate. Please try again."}
      </p>
    </div>
  );
}
