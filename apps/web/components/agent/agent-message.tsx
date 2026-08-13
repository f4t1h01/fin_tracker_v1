"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/cn";

import { AgentIconButton } from "./agent-icon-button";
import { AgentMark } from "./agent-mark";
import type { AgentMessage } from "./types";

const agentName = "Duet Agent";

function toParagraphs(text: string) {
  return text.split(/\n{2,}/).map((paragraph) => paragraph.trim()).filter(Boolean);
}

function CopyMessageButton({ text }: { text: string }) {
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (!isCopied) {
      return;
    }

    const timer = window.setTimeout(() => setIsCopied(false), 1800);
    return () => window.clearTimeout(timer);
  }, [isCopied]);

  return (
    <AgentIconButton
      icon={isCopied ? Check : Copy}
      size="sm"
      label={isCopied ? "Copied" : "Copy reply"}
      // Clipboard access is unavailable over plain http and inside some in-app
      // browsers; a failed copy should stay silent rather than throw.
      onClick={() => {
        void navigator.clipboard
          ?.writeText(text)
          .then(() => setIsCopied(true))
          .catch(() => undefined);
      }}
      className={cn(
        "border-transparent bg-transparent opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100",
        // Hover never happens on touch, so the action is simply always visible there.
        "[@media(hover:none)]:opacity-100",
        isCopied ? "text-[var(--sage)] opacity-100" : ""
      )}
    />
  );
}

function UserMessage({ text }: { text: string }) {
  return (
    <div className="agent-message-in flex justify-end">
      <div className="max-w-[86%] whitespace-pre-wrap break-words rounded-[22px] rounded-br-[8px] border border-[rgba(201,168,76,0.2)] bg-[color-mix(in_srgb,var(--warm-white)_88%,transparent)] px-4 py-3 text-[15px] leading-7 text-[var(--ink)] shadow-[0_10px_26px_rgba(26,20,16,0.06)] sm:max-w-[76%]">
        {text}
      </div>
    </div>
  );
}

function AgentReply({ text }: { text: string }) {
  return (
    <div className="agent-message-in group flex gap-3 sm:gap-4">
      <AgentMark size={32} className="mt-1 hidden sm:inline-flex" />

      <div className="min-w-0 flex-1 space-y-2">
        {/* A div, not a p: the mark renders an element that cannot legally nest in one. */}
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">
          <AgentMark size={22} className="sm:hidden" />
          {agentName}
        </div>

        <div className="space-y-3 text-[15px] leading-[1.75] text-[var(--ink)]">
          {toParagraphs(text).map((paragraph, index) => (
            <p key={index} className="whitespace-pre-wrap break-words">
              {paragraph}
            </p>
          ))}
        </div>

        <div className="flex items-center gap-1 pt-0.5">
          <CopyMessageButton text={text} />
        </div>
      </div>
    </div>
  );
}

export function AgentMessageRow({ message }: { message: AgentMessage }) {
  return message.role === "USER" ? <UserMessage text={message.text} /> : <AgentReply text={message.text} />;
}

export function AgentTypingRow() {
  return (
    <div className="agent-message-in flex gap-3 sm:gap-4" aria-live="polite" aria-label={`${agentName} is replying`}>
      <AgentMark size={32} className="mt-1 hidden sm:inline-flex" />

      <div className="min-w-0 flex-1 space-y-2">
        {/* A div, not a p: the mark renders an element that cannot legally nest in one. */}
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">
          <AgentMark size={22} className="sm:hidden" />
          {agentName}
        </div>

        <span className="agent-typing inline-flex items-center gap-1.5 py-2" aria-hidden="true">
          <span className="agent-typing-dot" />
          <span className="agent-typing-dot" />
          <span className="agent-typing-dot" />
        </span>
      </div>
    </div>
  );
}
