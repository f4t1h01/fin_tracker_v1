"use client";

import { type ReactNode, useEffect, useState } from "react";

import { AgentMark } from "./agent-mark";
import { agentSuggestions } from "./agent-preview-script";

function resolveGreeting(hour: number) {
  if (hour < 5) {
    return "Still up";
  }

  if (hour < 12) {
    return "Good morning";
  }

  if (hour < 18) {
    return "Good afternoon";
  }

  return "Good evening";
}

type AgentWelcomeProps = {
  onSelectSuggestion: (prompt: string) => void;
  isThinking: boolean;
  /** The composer, so the empty state and the docked bar share one instance of the logic. */
  children: ReactNode;
};

export function AgentWelcome({ onSelectSuggestion, isThinking, children }: AgentWelcomeProps) {
  // Resolved after mount: the server has no idea what time it is where you are,
  // and rendering its guess first would be a hydration mismatch.
  const [greeting, setGreeting] = useState("Hello");

  useEffect(() => {
    setGreeting(resolveGreeting(new Date().getHours()));
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-[46rem] flex-col items-center gap-5 px-4 py-6 sm:gap-8 sm:px-6 sm:py-10">
      <div className="flex flex-col items-center gap-3 text-center sm:gap-4">
        <AgentMark size={52} />
        <p className="eyebrow-row">AI Agent — preview</p>
        <h1 className="font-[family-name:var(--font-heading)] text-[clamp(30px,6vw,50px)] font-light leading-[1.1]">
          {greeting}.
          <br />
          <em className="italic text-[var(--blush-deep)]">What should we take care of?</em>
        </h1>
      </div>

      <div className="w-full">{children}</div>

      <div className="grid w-full gap-2 sm:grid-cols-2 sm:gap-2.5">
        {agentSuggestions.map((suggestion) => {
          const Icon = suggestion.icon;

          return (
            <button
              key={suggestion.id}
              type="button"
              disabled={isThinking}
              onClick={() => onSelectSuggestion(suggestion.prompt)}
              className="flex items-start gap-3 rounded-[18px] border border-[rgba(201,168,76,0.16)] bg-[color-mix(in_srgb,var(--warm-white)_66%,transparent)] px-4 py-3.5 text-left transition-[transform,border-color,background-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-[var(--gold)] hover:bg-[color-mix(in_srgb,var(--warm-white)_86%,transparent)] hover:shadow-[0_14px_30px_rgba(201,168,76,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="mt-0.5 inline-flex rounded-full bg-[color-mix(in_srgb,var(--gold)_14%,transparent)] p-2 text-[var(--gold)]">
                <Icon className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold text-[var(--ink)]">{suggestion.label}</span>
                <span className="mt-0.5 block text-[12px] leading-5 text-[var(--ink-soft)]">{suggestion.prompt}</span>
              </span>
            </button>
          );
        })}
      </div>

      <p className="max-w-md text-center text-[12px] leading-5 text-[var(--ink-soft)]">
        Nothing is connected yet — every reply is a placeholder while transactions, goods and reminders are wired in.
      </p>
    </div>
  );
}
