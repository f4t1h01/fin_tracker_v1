"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ApiResponseError, parseApiResponse } from "@/components/profile/api";
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

function isAbortError(reason: unknown) {
  return reason instanceof DOMException && reason.name === "AbortError";
}

function isUnavailableThreadError(reason: unknown) {
  if (!(reason instanceof Error)) {
    return false;
  }

  const message = reason.message.toLowerCase();
  if (reason instanceof ApiResponseError) {
    return reason.status === 404 || reason.status === 410 || (reason.status === 400 && message.includes("conversation not found"));
  }

  return message.includes("conversation not found");
}

export function useGoodsAdvisorWorkspace() {
  const [token, setToken] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<GoodsSnapshotResponse | null>(null);
  const [threads, setThreads] = useState<GoodsAdvisorThreadSummary[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [activeThread, setActiveThread] = useState<GoodsAdvisorThreadDetailResponse | null>(null);
  const [draftMessage, setDraftMessage] = useState("");
  const [newThreadScope, setNewThreadScope] = useState<GoodsAdvisorScope>("AUTO");
  const [isLoadingThreads, setIsLoadingThreads] = useState(false);
  const [isLoadingThread, setIsLoadingThread] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isMutatingThread, setIsMutatingThread] = useState(false);
  const [deletingThreadIds, setDeletingThreadIds] = useState<Set<string>>(() => new Set());
  const [pendingUserText, setPendingUserText] = useState<string | null>(null);

  const detailAbortRef = useRef<AbortController | null>(null);
  const detailRequestSeqRef = useRef(0);
  const actionSeqRef = useRef(0);
  const selectedThreadIdRef = useRef<string | null>(null);

  useEffect(() => {
    selectedThreadIdRef.current = activeThreadId;
  }, [activeThreadId]);

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

  const abortThreadLoad = useCallback(() => {
    detailAbortRef.current?.abort();
    detailAbortRef.current = null;
    detailRequestSeqRef.current += 1;
    setIsLoadingThread(false);
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

  const refreshThreads = useCallback(async () => {
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
      setThreads(sortThreads(nextThreads.items));
      setSnapshot(nextSnapshot);
      setNewThreadScope((current) => (nextSnapshot.workspace.hasPartnerConnection ? current : "AUTO"));
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Could not load advisor conversations";
      setError(message);
      if (message === "Invalid token" || message === "Missing bearer token") {
        clearSession();
      }
    } finally {
      setIsLoadingThreads(false);
    }
  }, [apiFetch, clearSession, token]);

  const closeChat = useCallback(() => {
    actionSeqRef.current += 1;
    abortThreadLoad();
    setIsChatOpen(false);
    setActiveThreadId(null);
    selectedThreadIdRef.current = null;
    setActiveThread(null);
    setDraftMessage("");
    setPendingUserText(null);
    setError(null);
  }, [abortThreadLoad]);

  const handleUnavailableThread = useCallback(
    (threadId: string) => {
      setThreads((current) => current.filter((item) => item.id !== threadId));
      setStatusMessage("That conversation is no longer available.");
      setIsChatOpen(false);
      setActiveThreadId(null);
      selectedThreadIdRef.current = null;
      setActiveThread(null);
      setPendingUserText(null);
      void refreshThreads();
    },
    [refreshThreads]
  );

  const openThread = useCallback(
    async (threadId: string) => {
      if (!token || deletingThreadIds.has(threadId)) {
        return;
      }

      actionSeqRef.current += 1;
      const requestId = detailRequestSeqRef.current + 1;
      detailRequestSeqRef.current = requestId;
      detailAbortRef.current?.abort();

      const controller = new AbortController();
      detailAbortRef.current = controller;

      setIsChatOpen(true);
      setActiveThreadId(threadId);
      selectedThreadIdRef.current = threadId;
      setActiveThread(null);
      setDraftMessage("");
      setPendingUserText(null);
      setIsLoadingThread(true);
      setError(null);
      setStatusMessage(null);

      try {
        const detail = await apiFetch<GoodsAdvisorThreadDetailResponse>(`/profile/me/goods/advisor/threads/${threadId}`, {
          signal: controller.signal
        });

        if (requestId !== detailRequestSeqRef.current || selectedThreadIdRef.current !== threadId) {
          return;
        }

        setActiveThread(detail);
        setThreads((current) => upsertThread(current, detail.thread));
      } catch (reason) {
        if (isAbortError(reason) || requestId !== detailRequestSeqRef.current) {
          return;
        }

        if (isUnavailableThreadError(reason)) {
          handleUnavailableThread(threadId);
        } else {
          setError(reason instanceof Error ? reason.message : "Could not load conversation");
        }
      } finally {
        if (requestId === detailRequestSeqRef.current) {
          setIsLoadingThread(false);
          detailAbortRef.current = null;
        }
      }
    },
    [apiFetch, deletingThreadIds, handleUnavailableThread, token]
  );

  useEffect(() => {
    if (!token) {
      return;
    }

    void refreshThreads();
  }, [refreshThreads, token]);

  useEffect(() => {
    return () => {
      detailAbortRef.current?.abort();
    };
  }, []);

  const startNewChat = useCallback(() => {
    actionSeqRef.current += 1;
    abortThreadLoad();
    setIsChatOpen(true);
    setActiveThreadId(null);
    selectedThreadIdRef.current = null;
    setActiveThread(null);
    setDraftMessage("");
    setPendingUserText(null);
    setError(null);
    setStatusMessage(null);
  }, [abortThreadLoad]);

  const createThread = useCallback(
    async (scope: GoodsAdvisorScope) => {
      const thread = await apiFetch<GoodsAdvisorThreadSummary>("/profile/me/goods/advisor/threads", {
        method: "POST",
        body: JSON.stringify({ scope })
      });
      setThreads((current) => upsertThread(current, thread));
      setActiveThreadId(thread.id);
      selectedThreadIdRef.current = thread.id;
      setIsChatOpen(true);
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

      const actionId = actionSeqRef.current;
      setIsChatOpen(true);
      setIsSending(true);
      setPendingUserText(prompt);
      setError(null);
      setStatusMessage(null);

      try {
        let threadId = activeThreadId;
        if (!threadId) {
          const created = await createThread(newThreadScope);
          if (actionId !== actionSeqRef.current) {
            return;
          }
          threadId = created.id;
        }

        const payload = await apiFetch<GoodsAdvisorSendMessageResponse>(`/profile/me/goods/advisor/threads/${threadId}/messages`, {
          method: "POST",
          body: JSON.stringify({ message: prompt })
        });

        if (actionId !== actionSeqRef.current || selectedThreadIdRef.current !== payload.thread.id) {
          return;
        }

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
        selectedThreadIdRef.current = payload.thread.id;
        if (overrideText === undefined) {
          setDraftMessage("");
        }
      } catch (reason) {
        if (isUnavailableThreadError(reason) && activeThreadId) {
          handleUnavailableThread(activeThreadId);
        } else {
          setError(reason instanceof Error ? reason.message : "Could not send message");
        }
      } finally {
        setPendingUserText(null);
        setIsSending(false);
      }
    },
    [activeThreadId, apiFetch, createThread, draftMessage, handleUnavailableThread, newThreadScope]
  );

  const updateThread = useCallback(
    async (threadId: string, payload: { title?: string | null; isPinned?: boolean; scope?: GoodsAdvisorScope }) => {
      setIsMutatingThread(true);
      setError(null);
      setStatusMessage(null);
      try {
        const thread = await apiFetch<GoodsAdvisorThreadSummary>(`/profile/me/goods/advisor/threads/${threadId}`, {
          method: "PATCH",
          body: JSON.stringify(payload)
        });
        setThreads((current) => upsertThread(current, thread));
        setActiveThread((current) => (current?.thread.id === threadId ? { ...current, thread } : current));
      } catch (reason) {
        if (isUnavailableThreadError(reason)) {
          handleUnavailableThread(threadId);
        } else {
          setError(reason instanceof Error ? reason.message : "Could not update conversation");
        }
      } finally {
        setIsMutatingThread(false);
      }
    },
    [apiFetch, handleUnavailableThread]
  );

  const deleteThread = useCallback(
    async (threadId: string) => {
      const wasOpenThread = selectedThreadIdRef.current === threadId;
      actionSeqRef.current += 1;
      setDeletingThreadIds((current) => new Set(current).add(threadId));
      setThreads((current) => current.filter((item) => item.id !== threadId));
      setError(null);
      setStatusMessage(null);

      if (wasOpenThread) {
        abortThreadLoad();
        setIsChatOpen(false);
        setActiveThreadId(null);
        selectedThreadIdRef.current = null;
        setActiveThread(null);
        setDraftMessage("");
        setPendingUserText(null);
      }

      try {
        await apiFetch<void>(`/profile/me/goods/advisor/threads/${threadId}`, {
          method: "DELETE"
        });
        setStatusMessage("Conversation deleted.");
        void refreshThreads();
      } catch (reason) {
        if (isUnavailableThreadError(reason)) {
          setStatusMessage("Conversation deleted.");
          void refreshThreads();
        } else {
          setError(reason instanceof Error ? reason.message : "Could not delete conversation");
          void refreshThreads();
        }
      } finally {
        setDeletingThreadIds((current) => {
          const next = new Set(current);
          next.delete(threadId);
          return next;
        });
      }
    },
    [abortThreadLoad, apiFetch, refreshThreads]
  );

  return {
    token,
    isReady,
    error,
    statusMessage,
    snapshot,
    threads,
    isChatOpen,
    activeThreadId,
    activeThread,
    draftMessage,
    setDraftMessage,
    newThreadScope,
    setNewThreadScope,
    isLoadingThreads,
    isLoadingThread,
    isSending,
    isMutatingThread,
    deletingThreadIds,
    pendingUserText,
    refreshThreads,
    openThread,
    closeChat,
    startNewChat,
    createThread,
    sendMessage,
    updateThread,
    deleteThread
  };
}
