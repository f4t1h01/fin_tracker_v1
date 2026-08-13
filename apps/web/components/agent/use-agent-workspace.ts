"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { tokenKey } from "@/components/profile/types";

import { loadAgentThreads, saveAgentThreads } from "./agent-local-store";
import { agentPreviewReply, agentPreviewReplyDelayMs } from "./agent-preview-script";
import type { AgentMessage, AgentThread, AgentThreadSummary } from "./types";

const maxTitleLength = 48;

function createId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `agent-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function deriveTitle(text: string) {
  const firstLine = text.split("\n").find((line) => line.trim().length) ?? text;
  const normalized = firstLine.replace(/\s+/g, " ").trim();

  if (normalized.length <= maxTitleLength) {
    return normalized || "New chat";
  }

  return `${normalized.slice(0, maxTitleLength).trimEnd()}...`;
}

function sortThreads(threads: AgentThread[]) {
  return [...threads].sort((left, right) => {
    if (left.isPinned !== right.isPinned) {
      return left.isPinned ? -1 : 1;
    }

    return right.updatedAt.localeCompare(left.updatedAt);
  });
}

function toSummary(thread: AgentThread): AgentThreadSummary {
  const lastMessage = thread.messages[thread.messages.length - 1];

  return {
    id: thread.id,
    title: thread.title,
    isPinned: thread.isPinned,
    updatedAt: thread.updatedAt,
    preview: lastMessage ? lastMessage.text.replace(/\s+/g, " ").trim() : "No messages yet"
  };
}

export function useAgentWorkspace() {
  const [token, setToken] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [threads, setThreads] = useState<AgentThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const replyTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setToken(window.localStorage.getItem(tokenKey));
    setThreads(sortThreads(loadAgentThreads()));
    setIsHydrated(true);
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    saveAgentThreads(threads);
  }, [isHydrated, threads]);

  useEffect(
    () => () => {
      if (replyTimerRef.current !== null) {
        window.clearTimeout(replyTimerRef.current);
      }
    },
    []
  );

  const clearReplyTimer = useCallback(() => {
    if (replyTimerRef.current !== null) {
      window.clearTimeout(replyTimerRef.current);
      replyTimerRef.current = null;
    }
  }, []);

  const activeThread = useMemo(
    () => threads.find((thread) => thread.id === activeThreadId) ?? null,
    [activeThreadId, threads]
  );

  const summaries = useMemo(() => threads.map(toSummary), [threads]);

  const visibleSummaries = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return summaries;
    }

    return summaries.filter(
      (summary) => summary.title.toLowerCase().includes(query) || summary.preview.toLowerCase().includes(query)
    );
  }, [searchQuery, summaries]);

  const startNewChat = useCallback(() => {
    clearReplyTimer();
    setIsThinking(false);
    setActiveThreadId(null);
    setDraft("");
  }, [clearReplyTimer]);

  const openThread = useCallback(
    (threadId: string) => {
      if (threadId === activeThreadId) {
        return;
      }

      clearReplyTimer();
      setIsThinking(false);
      setActiveThreadId(threadId);
      setDraft("");
    },
    [activeThreadId, clearReplyTimer]
  );

  const sendMessage = useCallback(
    (value?: string) => {
      const text = (value ?? draft).trim();
      if (!text || isThinking) {
        return;
      }

      const sentAt = new Date().toISOString();
      const userMessage: AgentMessage = { id: createId(), role: "USER", text, createdAt: sentAt };
      const isNewThread = activeThreadId === null;
      const threadId = activeThreadId ?? createId();

      setThreads((current) => {
        if (isNewThread) {
          return [
            {
              id: threadId,
              title: deriveTitle(text),
              isPinned: false,
              createdAt: sentAt,
              updatedAt: sentAt,
              messages: [userMessage]
            },
            ...current
          ];
        }

        return sortThreads(
          current.map((thread) =>
            thread.id === threadId
              ? { ...thread, updatedAt: sentAt, messages: [...thread.messages, userMessage] }
              : thread
          )
        );
      });

      if (isNewThread) {
        setActiveThreadId(threadId);
      }

      setDraft("");
      setIsThinking(true);

      // Stands in for the round trip to the agent API. See `agent-preview-script`.
      replyTimerRef.current = window.setTimeout(() => {
        const repliedAt = new Date().toISOString();
        const agentMessage: AgentMessage = {
          id: createId(),
          role: "AGENT",
          text: agentPreviewReply,
          createdAt: repliedAt
        };

        setThreads((current) =>
          sortThreads(
            current.map((thread) =>
              thread.id === threadId
                ? { ...thread, updatedAt: repliedAt, messages: [...thread.messages, agentMessage] }
                : thread
            )
          )
        );
        setIsThinking(false);
        replyTimerRef.current = null;
      }, agentPreviewReplyDelayMs);
    },
    [activeThreadId, draft, isThinking]
  );

  const renameThread = useCallback((threadId: string, title: string) => {
    const nextTitle = title.replace(/\s+/g, " ").trim().slice(0, 120);
    if (!nextTitle) {
      return;
    }

    setThreads((current) => current.map((thread) => (thread.id === threadId ? { ...thread, title: nextTitle } : thread)));
  }, []);

  const togglePinned = useCallback((threadId: string) => {
    setThreads((current) =>
      sortThreads(current.map((thread) => (thread.id === threadId ? { ...thread, isPinned: !thread.isPinned } : thread)))
    );
  }, []);

  const deleteThread = useCallback(
    (threadId: string) => {
      setThreads((current) => current.filter((thread) => thread.id !== threadId));

      setActiveThreadId((current) => {
        if (current !== threadId) {
          return current;
        }

        clearReplyTimer();
        setIsThinking(false);
        return null;
      });
    },
    [clearReplyTimer]
  );

  return {
    token,
    isReady,
    threads,
    summaries,
    visibleSummaries,
    activeThread,
    activeThreadId,
    draft,
    setDraft,
    isThinking,
    searchQuery,
    setSearchQuery,
    startNewChat,
    openThread,
    sendMessage,
    renameThread,
    togglePinned,
    deleteThread
  };
}
