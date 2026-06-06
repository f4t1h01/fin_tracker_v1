"use client";

import { ArrowRight } from "lucide-react";
import { useEffect, useRef } from "react";

import { GoogleMark } from "./google-mark";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (response: { credential?: string }) => void }) => void;
          renderButton: (element: HTMLElement, options: { theme: "outline"; size: "large"; type: "standard"; text: "signin_with"; shape: "rectangular"; width?: number }) => void;
        };
      };
    };
  }
}

type GoogleIdentityButtonProps = {
  clientId: string;
  onCredential: (credential: string) => void;
};

export function GoogleIdentityButton({ clientId, onCredential }: GoogleIdentityButtonProps) {
  const buttonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!clientId || !buttonRef.current) {
      return;
    }

    let isCancelled = false;
    const renderButton = () => {
      if (isCancelled || !window.google || !buttonRef.current) {
        return;
      }

      buttonRef.current.innerHTML = "";
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => {
          if (response.credential) {
            onCredential(response.credential);
          }
        }
      });
      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: "outline",
        size: "large",
        type: "standard",
        text: "signin_with",
        shape: "rectangular",
        width: buttonRef.current.offsetWidth || 320
      });
    };

    if (window.google) {
      renderButton();
      return () => {
        isCancelled = true;
      };
    }

    const existingScript = document.getElementById("google-identity-services");
    if (existingScript) {
      existingScript.addEventListener("load", renderButton, { once: true });
      return () => {
        isCancelled = true;
        existingScript.removeEventListener("load", renderButton);
      };
    }

    const script = document.createElement("script");
    script.id = "google-identity-services";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.addEventListener("load", renderButton, { once: true });
    document.head.appendChild(script);

    return () => {
      isCancelled = true;
      script.removeEventListener("load", renderButton);
    };
  }, [clientId, onCredential]);

  return (
    <div className="auth-choice auth-choice-google-system">
      <span className="auth-choice-google-content">
        <GoogleMark />
        <span>Continue with Google</span>
        <ArrowRight className="ml-auto size-4" />
      </span>
      <div ref={buttonRef} className="auth-choice-google-click-target" />
    </div>
  );
}
