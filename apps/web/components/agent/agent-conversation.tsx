"use client";

import { ArrowDown } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { AgentMessageRow, AgentTypingRow } from "./agent-message";
import type { AgentMessage } from "./types";

/** How far from the bottom still counts as "following the conversation". */
const bottomThresholdPx = 96;

type AgentConversationProps = {
  threadKey: string;
  messages: AgentMessage[];
  isThinking: boolean;
};

export function AgentConversation({ threadKey, messages, isThinking }: AgentConversationProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const hasAnimatedRef = useRef(false);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const scrollToBottom = useCallback((behavior: ScrollBehavior) => {
    const node = scrollRef.current;
    if (!node) {
      return;
    }

    node.scrollTo({ top: node.scrollHeight, behavior });
  }, []);

  // Opening another conversation should land at the latest message, not glide there.
  useEffect(() => {
    hasAnimatedRef.current = false;
    setIsAtBottom(true);
  }, [threadKey]);

  useEffect(() => {
    if (!isAtBottom) {
      return;
    }

    scrollToBottom(hasAnimatedRef.current ? "smooth" : "auto");
    hasAnimatedRef.current = true;
  }, [isAtBottom, isThinking, messages.length, scrollToBottom]);

  const handleScroll = useCallback(() => {
    const node = scrollRef.current;
    if (!node) {
      return;
    }

    setIsAtBottom(node.scrollHeight - node.scrollTop - node.clientHeight < bottomThresholdPx);
  }, []);

  return (
    <div className="relative min-h-0 flex-1">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="agent-scroll h-full overflow-y-auto overscroll-contain px-4 pb-8 pt-6 sm:px-6"
      >
        <div className="mx-auto flex w-full max-w-[46rem] flex-col gap-6 sm:gap-8">
          {messages.map((message) => (
            <AgentMessageRow key={message.id} message={message} />
          ))}
          {isThinking ? <AgentTypingRow /> : null}
        </div>
      </div>

      {isAtBottom ? null : (
        <button
          type="button"
          onClick={() => scrollToBottom("smooth")}
          className="absolute bottom-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-2 rounded-full border border-[rgba(201,168,76,0.24)] bg-[color-mix(in_srgb,var(--warm-white)_92%,transparent)] px-4 py-2 text-[11px] uppercase tracking-[0.14em] text-[var(--ink-soft)] shadow-[0_12px_28px_rgba(26,20,16,0.12)] backdrop-blur-xl transition-colors hover:border-[var(--gold)] hover:text-[var(--ink)]"
        >
          <ArrowDown className="size-3.5" />
          Latest
        </button>
      )}
    </div>
  );
}
