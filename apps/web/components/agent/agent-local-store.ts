import type { AgentMessageRole, AgentThread } from "./types";

/**
 * Browser-only storage for preview conversations.
 *
 * The agent has no API yet, so history would vanish on every reload and the
 * sidebar would never show what it is for. This keeps threads in localStorage
 * under a versioned key so the surface can be judged as a working product.
 * It is deliberately isolated: when the server-side thread API lands, delete
 * this file and swap `use-agent-workspace` over to it.
 */
const storageKey = "duet.agent.preview-threads.v1";

/** Keeps one runaway session from filling the origin's storage quota. */
const maxStoredThreads = 60;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseThread(value: unknown): AgentThread | null {
  if (!isRecord(value)) {
    return null;
  }

  const { id, title, isPinned, createdAt, updatedAt, messages } = value;

  if (typeof id !== "string" || typeof title !== "string" || typeof createdAt !== "string" || typeof updatedAt !== "string") {
    return null;
  }

  if (!Array.isArray(messages)) {
    return null;
  }

  const parsedMessages = messages.flatMap((message) => {
    if (!isRecord(message)) {
      return [];
    }

    const { id: messageId, role, text, createdAt: messageCreatedAt } = message;
    if (typeof messageId !== "string" || typeof text !== "string" || typeof messageCreatedAt !== "string") {
      return [];
    }

    const parsedRole: AgentMessageRole | null = role === "USER" ? "USER" : role === "AGENT" ? "AGENT" : null;
    if (!parsedRole) {
      return [];
    }

    return [{ id: messageId, role: parsedRole, text, createdAt: messageCreatedAt }];
  });

  return {
    id,
    title,
    isPinned: isPinned === true,
    createdAt,
    updatedAt,
    messages: parsedMessages
  };
}

export function loadAgentThreads(): AgentThread[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return [];
    }

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.flatMap((item) => {
      const thread = parseThread(item);
      return thread ? [thread] : [];
    });
  } catch {
    // Corrupted or blocked storage is not worth an error state on a preview screen.
    return [];
  }
}

export function saveAgentThreads(threads: AgentThread[]) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(threads.slice(0, maxStoredThreads)));
  } catch {
    // Private-mode / quota failures must not break the chat itself.
  }
}
