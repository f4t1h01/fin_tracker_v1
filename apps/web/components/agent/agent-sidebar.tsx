"use client";

import { PanelLeftClose, PanelLeftOpen, Plus, Search, X } from "lucide-react";

import { cn } from "@/lib/cn";

import { AgentIconButton } from "./agent-icon-button";
import { AgentMark } from "./agent-mark";
import { AgentThreadList } from "./agent-thread-list";
import type { AgentThreadSummary } from "./types";

type AgentSidebarProps = {
  variant: "rail" | "drawer";
  summaries: AgentThreadSummary[];
  hasThreads: boolean;
  activeThreadId: string | null;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onOpen: (threadId: string) => void;
  onNewChat: () => void;
  onTogglePinned: (threadId: string) => void;
  onDelete: (threadId: string) => void;
  isCollapsed?: boolean;
  onToggleCollapsed?: () => void;
  onClose?: () => void;
  className?: string;
};

export function AgentSidebar({
  variant,
  summaries,
  hasThreads,
  activeThreadId,
  searchQuery,
  onSearchChange,
  onOpen,
  onNewChat,
  onTogglePinned,
  onDelete,
  isCollapsed = false,
  onToggleCollapsed,
  onClose,
  className
}: AgentSidebarProps) {
  const isRail = variant === "rail";
  const showCollapsed = isRail && isCollapsed;

  return (
    <aside
      aria-label="Conversation history"
      className={cn(
        "flex h-full flex-col border-r border-[rgba(201,168,76,0.14)] bg-[color-mix(in_srgb,var(--cream)_62%,transparent)] backdrop-blur-2xl",
        // The drawer floats over the conversation, so it needs a surface of its
        // own rather than the rail's see-through wash.
        isRail
          ? "transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
          : "bg-[color-mix(in_srgb,var(--warm-white)_97%,transparent)] pb-[env(safe-area-inset-bottom)]",
        showCollapsed ? "w-[76px]" : isRail ? "w-[288px]" : "w-full",
        className
      )}
    >
      {showCollapsed ? (
        <div className="flex flex-col items-center gap-3 px-3 py-4">
          <AgentMark size={34} />
          <AgentIconButton icon={PanelLeftOpen} label="Expand history" onClick={onToggleCollapsed} />
          <AgentIconButton icon={Plus} label="New chat" onClick={onNewChat} tone="active" />
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3 px-4 pb-3 pt-4">
            <AgentMark size={34} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-[family-name:var(--font-heading)] text-[19px] font-normal leading-tight">AI Agent</p>
              <p className="truncate text-[10px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">Duet workspace</p>
            </div>

            {isRail ? (
              <AgentIconButton icon={PanelLeftClose} label="Collapse history" onClick={onToggleCollapsed} />
            ) : (
              <AgentIconButton icon={X} label="Close history" onClick={onClose} />
            )}
          </div>

          <div className="px-3 pb-3">
            <button
              type="button"
              onClick={onNewChat}
              className="flex w-full items-center justify-center gap-2 rounded-[14px] border border-[rgba(201,168,76,0.28)] bg-[color-mix(in_srgb,var(--gold)_10%,transparent)] px-3 py-2.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--ink)] transition-[background-color,border-color,transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-[var(--gold)] hover:shadow-[0_12px_26px_rgba(201,168,76,0.16)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            >
              <Plus className="size-4 text-[var(--gold)]" />
              New chat
            </button>
          </div>

          {hasThreads ? (
            <div className="px-3 pb-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--ink-soft)]" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => onSearchChange(event.target.value)}
                  placeholder="Search chats"
                  aria-label="Search conversations"
                  className="app-input agent-search-input"
                />
              </div>
            </div>
          ) : null}

          <div className="agent-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-4">
            <AgentThreadList
              summaries={summaries}
              hasThreads={hasThreads}
              activeThreadId={activeThreadId}
              onOpen={onOpen}
              onTogglePinned={onTogglePinned}
              onDelete={onDelete}
            />
          </div>

          <div className="border-t border-[rgba(201,168,76,0.12)] px-4 py-3">
            <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">Preview build</p>
            <p className="mt-1 text-[11px] leading-4 text-[var(--ink-soft)]">
              Chats stay on this device until the agent is connected.
            </p>
          </div>
        </>
      )}
    </aside>
  );
}
