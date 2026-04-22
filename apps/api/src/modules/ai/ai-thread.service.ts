import { BadRequestException, Injectable } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";

const THREAD_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const THREAD_SUMMARY_MAX_LENGTH = 2000;
const THREAD_RECENT_MESSAGE_LIMIT = 6;
const THREAD_PREVIEW_MAX_LENGTH = 140;
const THREAD_TITLE_MAX_LENGTH = 80;

type AiThreadFeature = "GOODS_ADVISOR";
type AiThreadScope = "AUTO" | "PERSONAL" | "SHARED";
type AiMessageRole = "USER" | "ASSISTANT" | "SYSTEM";

function trimText(value: string, maxLength: number) {
  const normalized = value.trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function effectiveTitle(thread: {
  titleOverride: string | null;
  autoTitle: string | null;
}) {
  return thread.titleOverride?.trim() || thread.autoTitle?.trim() || "New chat";
}

function deriveAutoTitle(text: string) {
  const normalized = text.trim().replace(/\s+/g, " ");
  if (!normalized) {
    return "New chat";
  }

  return trimText(normalized, THREAD_TITLE_MAX_LENGTH);
}

@Injectable()
export class AiThreadService {
  constructor(private readonly prisma: PrismaService) {}

  private resolveExpiry(isPinned: boolean, reference = new Date()) {
    if (isPinned) {
      return null;
    }

    return new Date(reference.getTime() + THREAD_RETENTION_MS);
  }

  async cleanupExpiredThreadsForUser(userId: string, feature?: AiThreadFeature) {
    await this.prisma.client.aiThread.deleteMany({
      where: {
        userId,
        ...(feature ? { feature } : {}),
        isPinned: false,
        expiresAt: {
          lte: new Date()
        }
      }
    });
  }

  async createThread(params: {
    userId: string;
    coupleId: string | null;
    feature: AiThreadFeature;
    scope: AiThreadScope;
  }) {
    await this.cleanupExpiredThreadsForUser(params.userId, params.feature);
    const now = new Date();
    const thread = await this.prisma.client.aiThread.create({
      data: {
        userId: params.userId,
        coupleId: params.coupleId,
        feature: params.feature,
        scope: params.scope,
        lastActivityAt: now,
        expiresAt: this.resolveExpiry(false, now)
      }
    });

    return this.serializeThreadSummary(thread);
  }

  async listThreads(userId: string, feature: AiThreadFeature) {
    await this.cleanupExpiredThreadsForUser(userId, feature);
    const threads = await this.prisma.client.aiThread.findMany({
      where: {
        userId,
        feature
      },
      orderBy: [{ isPinned: "desc" }, { lastActivityAt: "desc" }],
      select: {
        id: true,
        scope: true,
        autoTitle: true,
        titleOverride: true,
        isPinned: true,
        lastActivityAt: true,
        createdAt: true,
        lastMessagePreview: true
      }
    });

    return {
      items: threads.map((thread) => this.serializeThreadSummary(thread))
    };
  }

  async getThreadWithMessages(params: {
    userId: string;
    feature: AiThreadFeature;
    threadId: string;
  }) {
    await this.cleanupExpiredThreadsForUser(params.userId, params.feature);
    const thread = await this.prisma.client.aiThread.findFirst({
      where: {
        id: params.threadId,
        userId: params.userId,
        feature: params.feature
      },
      select: {
        id: true,
        scope: true,
        autoTitle: true,
        titleOverride: true,
        isPinned: true,
        summaryText: true,
        lastMessagePreview: true,
        lastActivityAt: true,
        createdAt: true,
        messages: {
          orderBy: {
            createdAt: "asc"
          },
          select: {
            id: true,
            role: true,
            text: true,
            payload: true,
            createdAt: true
          }
        }
      }
    });

    if (!thread) {
      throw new BadRequestException("Conversation not found");
    }

    return {
      thread: this.serializeThreadSummary(thread),
      summaryText: thread.summaryText,
      messages: thread.messages.map((message) => ({
        id: message.id,
        role: message.role,
        text: message.text,
        payload: message.payload,
        createdAt: message.createdAt.toISOString()
      }))
    };
  }

  async updateThread(params: {
    userId: string;
    feature: AiThreadFeature;
    threadId: string;
    title?: string | null;
    isPinned?: boolean;
    scope?: AiThreadScope;
  }) {
    await this.cleanupExpiredThreadsForUser(params.userId, params.feature);
    const existing = await this.prisma.client.aiThread.findFirst({
      where: {
        id: params.threadId,
        userId: params.userId,
        feature: params.feature
      },
      select: {
        id: true,
        isPinned: true,
        lastActivityAt: true
      }
    });

    if (!existing) {
      throw new BadRequestException("Conversation not found");
    }

    const nextPinned = params.isPinned ?? existing.isPinned;
    const updated = await this.prisma.client.aiThread.update({
      where: { id: params.threadId },
      data: {
        titleOverride: params.title === undefined ? undefined : trimText(params.title ?? "", THREAD_TITLE_MAX_LENGTH) || null,
        isPinned: params.isPinned,
        scope: params.scope,
        expiresAt: params.isPinned === undefined ? undefined : this.resolveExpiry(nextPinned, existing.lastActivityAt)
      },
      select: {
        id: true,
        scope: true,
        autoTitle: true,
        titleOverride: true,
        isPinned: true,
        lastActivityAt: true,
        createdAt: true,
        lastMessagePreview: true
      }
    });

    return this.serializeThreadSummary(updated);
  }

  async deleteThread(params: {
    userId: string;
    feature: AiThreadFeature;
    threadId: string;
  }) {
    await this.cleanupExpiredThreadsForUser(params.userId, params.feature);
    const existing = await this.prisma.client.aiThread.findFirst({
      where: {
        id: params.threadId,
        userId: params.userId,
        feature: params.feature
      },
      select: { id: true }
    });

    if (!existing) {
      throw new BadRequestException("Conversation not found");
    }

    await this.prisma.client.aiThread.delete({
      where: { id: params.threadId }
    });

    return { success: true };
  }

  async appendMessage(params: {
    threadId: string;
    role: AiMessageRole;
    text: string;
    payload?: unknown;
    userId?: string | null;
  }) {
    const now = new Date();
    const created = await this.prisma.client.aiMessage.create({
      data: {
        threadId: params.threadId,
        role: params.role,
        userId: params.userId ?? null,
        text: params.text,
        payload: params.payload === undefined ? undefined : (params.payload as never)
      },
      select: {
        id: true,
        role: true,
        text: true,
        payload: true,
        createdAt: true
      }
    });

    const thread = await this.prisma.client.aiThread.findUnique({
      where: { id: params.threadId },
      select: {
        id: true,
        autoTitle: true,
        titleOverride: true,
        isPinned: true
      }
    });

    if (!thread) {
      throw new BadRequestException("Conversation not found");
    }

    await this.prisma.client.aiThread.update({
      where: { id: params.threadId },
      data: {
        autoTitle:
          params.role === "USER" && !thread.autoTitle && !thread.titleOverride
            ? deriveAutoTitle(params.text)
            : undefined,
        lastMessagePreview: trimText(params.text, THREAD_PREVIEW_MAX_LENGTH),
        lastActivityAt: now,
        expiresAt: this.resolveExpiry(thread.isPinned, now)
      }
    });

    return {
      id: created.id,
      role: created.role,
      text: created.text,
      payload: created.payload,
      createdAt: created.createdAt.toISOString()
    };
  }

  async rebuildSummary(threadId: string) {
    const messages = await this.prisma.client.aiMessage.findMany({
      where: {
        threadId
      },
      orderBy: {
        createdAt: "asc"
      },
      select: {
        role: true,
        text: true
      }
    });

    const olderMessages = messages.slice(0, Math.max(0, messages.length - THREAD_RECENT_MESSAGE_LIMIT));
    const summaryText = olderMessages.length
      ? trimText(
          olderMessages
            .map((message) => `${message.role === "USER" ? "User" : message.role === "ASSISTANT" ? "Assistant" : "System"}: ${message.text}`)
            .join("\n"),
          THREAD_SUMMARY_MAX_LENGTH
        )
      : null;

    await this.prisma.client.aiThread.update({
      where: { id: threadId },
      data: {
        summaryText
      }
    });
  }

  async getConversationContext(params: {
    userId: string;
    feature: AiThreadFeature;
    threadId: string;
  }) {
    await this.cleanupExpiredThreadsForUser(params.userId, params.feature);
    const thread = await this.prisma.client.aiThread.findFirst({
      where: {
        id: params.threadId,
        userId: params.userId,
        feature: params.feature
      },
      select: {
        id: true,
        coupleId: true,
        scope: true,
        summaryText: true,
        messages: {
          orderBy: {
            createdAt: "desc"
          },
          take: THREAD_RECENT_MESSAGE_LIMIT,
          select: {
            role: true,
            text: true
          }
        }
      }
    });

    if (!thread) {
      throw new BadRequestException("Conversation not found");
    }

    return {
      thread: {
        id: thread.id,
        coupleId: thread.coupleId,
        scope: thread.scope
      },
      summaryText: thread.summaryText,
      recentMessages: [...thread.messages].reverse()
    };
  }

  serializeThreadSummary(thread: {
    id: string;
    scope: string;
    autoTitle: string | null;
    titleOverride: string | null;
    isPinned: boolean;
    lastActivityAt: Date;
    createdAt: Date;
    lastMessagePreview?: string | null;
  }) {
    return {
      id: thread.id,
      title: effectiveTitle(thread),
      scope: thread.scope,
      isPinned: thread.isPinned,
      lastActivityAt: thread.lastActivityAt.toISOString(),
      createdAt: thread.createdAt.toISOString(),
      lastMessagePreview: thread.lastMessagePreview ?? null
    };
  }
}
