"use client";

import { useCallback, useEffect, useState } from "react";

import { parseApiResponse } from "@/components/profile/api";
import { authSourceKey, tokenKey } from "@/components/profile/types";
import { webEnv } from "@/lib/env";

import type {
  GoodsAdvisorScope,
  GoodsAdvisorThreadDetailResponse,
  GoodsAdvisorThreadSummary,
  GoodsAdvisorThreadsResponse,
  GoodsAdvisorSendMessageResponse,
  GoodsSnapshotResponse
} from "./types";

function sortThreads(items: GoodsAdvisorThreadSummary[]) {
  return [...items].sort((left, right) => {
    if (left.isPinned !== right.isPinned) {
      return left.isPinned ? -1 : 1;
    }

    return right.lastActivityAt.localeCompare(left.lastActivityAt);
  });
}

function upsertThread(items: GoodsAdvisorThreadSummary[], nextItem: GoodsAdvisorThreadSummary) {
  const next = items.filter((item) => item.id !== nextItem.id);
  next.unshift(nextItem);
  return sortThreads(next);
}

export function useGoodsAdvisorWorkspace() {
  const [token, setToken] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<GoodsSnapshotResponse | null>(null);
  const [threads, setThreads] = useState<GoodsAdvisorThreadSummary[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [activeThread, setActiveThread] = useState<GoodsAdvisorThreadDetailResponse | null>(null);
  const [draftMessage, setDraftMessage] = useState("");
  const [newThreadScope, setNewThreadScope] = useState<GoodsAdvisorScope>("AUTO");
  const [isLoadingThreads, setIsLoadingThreads] = useState(false);
  const [isLoadingThread, setIsLoadingThread] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isMutatingThread, setIsMutatingThread] = useState(false);
  const [pendingUserText, setPendingUserText] = useState<string | null>(null);

  useEffect(() => {
    const storedToken = window.localStorage.getItem(tokenKey);
    setToken(storedToken);
    setIsReady(true);
  }, []);

  const clearSession = useCallback(() => {
    window.localStorage.removeItem(tokenKey);
    window.localStorage.removeItem(authSourceKey);
    setToken(null);
  }, []);

  const apiFetch = useCallback(
    async <T>(path: string, init?: RequestInit) => {
      if (!token) {
        throw new Error("Missing bearer token");
      }

      const hasJsonBody = init?.body !== undefined && init.body !== null;
      const response = await fetch(`${webEnv.apiUrl}${path}`, {
        ...init,
        headers: {
          ...(hasJsonBody ? { "Content-Type": "application/json" } : {}),
          Authorization: `Bearer ${token}`,
          ...(init?.headers ?? {})
        }
      });

      return parseApiResponse<T>(response);
    },
    [token]
  );

  const refreshThreads = useCallback(
    async (options?: { preserveSelection?: boolean }) => {
      if (!token) {
        return;
      }

      setIsLoadingThreads(true);
      setError(null);

      try {
        const [nextThreads, nextSnapshot] = await Promise.all([
          apiFetch<GoodsAdvisorThreadsResponse>("/profile/me/goods/advisor/threads"),
          apiFetch<GoodsSnapshotResponse>("/profile/me/goods/snapshot")
        ]);
        const sorted = sortThreads(nextThreads.items);
        setThreads(sorted);
        setSnapshot(nextSnapshot);
        setNewThreadScope((current) => (nextSnapshot.workspace.hasPartnerConnection ? current : "AUTO"));

        setActiveThreadId((current) => {
          if (options?.preserveSelection && current && sorted.some((item) => item.id === current)) {
            return current;
          }

          return sorted[0]?.id ?? null;
        });
      } catch (reason) {
        const message = reason instanceof Error ? reason.message : "Could not load advisor conversations";
        setError(message);
        if (message === "Invalid token" || message === "Missing bearer token") {
          clearSession();
        }
      } finally {
        setIsLoadingThreads(false);
      }
    },
    [apiFetch, clearSession, token]
  );

  const loadThread = useCallback(
    async (threadId: string) => {
      if (!token) {
        return;
      }

      setIsLoadingThread(true);
      setError(null);

      try {
        const detail = await apiFetch<GoodsAdvisorThreadDetailResponse>(`/profile/me/goods/advisor/threads/${threadId}`);
        setActiveThread(detail);
        setActiveThreadId(threadId);
        setThreads((current) => upsertThread(current, detail.thread));
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "Could not load conversation");
      } finally {
        setIsLoadingThread(false);
      }
    },
    [apiFetch, token]
  );

  useEffect(() => {
    if (!token) {
      return;
    }

    void refreshThreads();
  }, [refreshThreads, token]);

  useEffect(() => {
    if (!token || !activeThreadId) {
      setActiveThread(null);
      return;
    }

    void loadThread(activeThreadId);
  }, [activeThreadId, loadThread, token]);

  const startNewChat = useCallback(() => {
    setActiveThreadId(null);
    setActiveThread(null);
    setDraftMessage("");
    setPendingUserText(null);
    setError(null);
  }, []);

  const createThread = useCallback(
    async (scope: GoodsAdvisorScope) => {
      const thread = await apiFetch<GoodsAdvisorThreadSummary>("/profile/me/goods/advisor/threads", {
        method: "POST",
        body: JSON.stringify({ scope })
      });
      setThreads((current) => upsertThread(current, thread));
      setActiveThreadId(thread.id);
      setActiveThread({
        thread,
        summaryText: null,
        messages: []
      });
      return thread;
    },
    [apiFetch]
  );

  const sendMessage = useCallback(
    async (overrideText?: string) => {
      const prompt = (overrideText ?? draftMessage).trim();
      if (!prompt) {
        setError("Enter a message first.");
        return;
      }

      setIsSending(true);
      setPendingUserText(prompt);
      setError(null);

      try {
        let threadId = activeThreadId;
        if (!threadId) {
          const created = await createThread(newThreadScope);
          threadId = created.id;
        }

        const payload = await apiFetch<GoodsAdvisorSendMessageResponse>(`/profile/me/goods/advisor/threads/${threadId}/messages`, {
          method: "POST",
          body: JSON.stringify({ message: prompt })
        });

        setThreads((current) => upsertThread(current, payload.thread));
        setActiveThread((current) => ({
          thread: payload.thread,
          summaryText: current?.summaryText ?? null,
          messages:
            current?.thread.id === payload.thread.id
              ? [...current.messages, payload.userMessage, payload.assistantMessage]
              : [payload.userMessage, payload.assistantMessage]
        }));
        setActiveThreadId(payload.thread.id);
        if (overrideText === undefined) {
          setDraftMessage("");
        }
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "Could not send message");
      } finally {
        setPendingUserText(null);
        setIsSending(false);
      }
    },
    [activeThreadId, apiFetch, createThread, draftMessage, newThreadScope]
  );

  const updateThread = useCallback(
    async (threadId: string, payload: { title?: string | null; isPinned?: boolean; scope?: GoodsAdvisorScope }) => {
      setIsMutatingThread(true);
      setError(null);
      try {
        const thread = await apiFetch<GoodsAdvisorThreadSummary>(`/profile/me/goods/advisor/threads/${threadId}`, {
          method: "PATCH",
          body: JSON.stringify(payload)
        });
        setThreads((current) => upsertThread(current, thread));
        setActiveThread((current) => (current?.thread.id === threadId ? { ...current, thread } : current));
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "Could not update conversation");
      } finally {
        setIsMutatingThread(false);
      }
    },
    [apiFetch]
  );

  const deleteThread = useCallback(
    async (threadId: string) => {
      setIsMutatingThread(true);
      setError(null);

      try {
        await apiFetch<{ success: true }>(`/profile/me/goods/advisor/threads/${threadId}`, {
          method: "DELETE"
        });
        setThreads((current) => current.filter((item) => item.id !== threadId));
        setActiveThread((current) => (current?.thread.id === threadId ? null : current));
        setActiveThreadId((current) => (current === threadId ? null : current));
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "Could not delete conversation");
      } finally {
        setIsMutatingThread(false);
      }
    },
    [apiFetch]
  );

  return {
    token,
    isReady,
    error,
    snapshot,
    threads,
    activeThreadId,
    setActiveThreadId,
    activeThread,
    draftMessage,
    setDraftMessage,
    newThreadScope,
    setNewThreadScope,
    isLoadingThreads,
    isLoadingThread,
    isSending,
    isMutatingThread,
    pendingUserText,
    refreshThreads,
    loadThread,
    startNewChat,
    createThread,
    sendMessage,
    updateThread,
    deleteThread
  };
}
