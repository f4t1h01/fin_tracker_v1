"use client";

import { useCallback, useEffect, useState } from "react";

import { useRouteTransitionPageReady } from "@/components/navigation/route-transition-provider";
import { ProfileLoadingState } from "@/components/profile/profile-loading-state";

import { AgentComposer } from "./agent-composer";
import { AgentConversation } from "./agent-conversation";
import { AgentSidebar } from "./agent-sidebar";
import { AgentTopBar } from "./agent-topbar";
import { AgentWelcome } from "./agent-welcome";
import { useAgentViewportHeight } from "./use-agent-viewport-height";
import { useAgentWorkspace } from "./use-agent-workspace";

export function AgentPage() {
  const workspace = useAgentWorkspace();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  useAgentViewportHeight();
  useRouteTransitionPageReady(workspace.isReady);

  useEffect(() => {
    if (workspace.isReady && !workspace.token) {
      window.location.replace("/profile/me");
    }
  }, [workspace.isReady, workspace.token]);

  useEffect(() => {
    if (!isHistoryOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsHistoryOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isHistoryOpen]);

  const { deleteThread, openThread, startNewChat } = workspace;

  const handleOpenThread = useCallback(
    (threadId: string) => {
      openThread(threadId);
      setIsHistoryOpen(false);
    },
    [openThread]
  );

  const handleNewChat = useCallback(() => {
    startNewChat();
    setIsHistoryOpen(false);
  }, [startNewChat]);

  const handleDeleteThread = useCallback(
    (threadId: string) => {
      if (window.confirm("Delete this conversation?")) {
        deleteThread(threadId);
      }
    },
    [deleteThread]
  );

  if (!workspace.isReady || !workspace.token) {
    return <ProfileLoadingState title="Opening AI Agent" description="Preparing your assistant workspace..." />;
  }

  const messages = workspace.activeThread?.messages ?? [];
  const hasConversation = messages.length > 0;

  const sidebarProps = {
    summaries: workspace.visibleSummaries,
    hasThreads: workspace.summaries.length > 0,
    activeThreadId: workspace.activeThreadId,
    searchQuery: workspace.searchQuery,
    onSearchChange: workspace.setSearchQuery,
    onOpen: handleOpenThread,
    onNewChat: handleNewChat,
    onTogglePinned: workspace.togglePinned,
    onDelete: handleDeleteThread
  };

  const composer = (
    <AgentComposer
      value={workspace.draft}
      onChange={workspace.setDraft}
      onSubmit={() => workspace.sendMessage()}
      isThinking={workspace.isThinking}
      autoFocus
    />
  );

  return (
    <div className="flex w-full overflow-hidden" style={{ height: "var(--agent-viewport-height, 100dvh)" }}>
      <AgentSidebar
        {...sidebarProps}
        variant="rail"
        className="hidden lg:flex"
        isCollapsed={isSidebarCollapsed}
        onToggleCollapsed={() => setIsSidebarCollapsed((current) => !current)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <AgentTopBar
          title={workspace.activeThread?.title ?? "New chat"}
          hasThread={Boolean(workspace.activeThread)}
          onOpenHistory={() => setIsHistoryOpen(true)}
          onNewChat={handleNewChat}
          onRename={(title) => {
            if (workspace.activeThreadId) {
              workspace.renameThread(workspace.activeThreadId, title);
            }
          }}
          onDelete={() => {
            if (workspace.activeThreadId) {
              handleDeleteThread(workspace.activeThreadId);
            }
          }}
        />

        {hasConversation ? (
          <>
            <AgentConversation
              threadKey={workspace.activeThreadId ?? "new"}
              messages={messages}
              isThinking={workspace.isThinking}
            />

            <div className="shrink-0 border-t border-[rgba(201,168,76,0.12)] bg-[color-mix(in_srgb,var(--cream)_54%,transparent)] backdrop-blur-2xl">
              <div className="mx-auto w-full max-w-[46rem] px-3 pb-[max(0.85rem,env(safe-area-inset-bottom))] pt-3 sm:px-6">
                {composer}
                <p className="mt-2 text-center text-[11px] leading-4 text-[var(--ink-soft)]">
                  Preview build — the agent is not connected yet.
                </p>
              </div>
            </div>
          </>
        ) : (
          <div className="agent-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <div className="grid min-h-full place-items-center pb-[env(safe-area-inset-bottom)]">
              <AgentWelcome onSelectSuggestion={workspace.sendMessage} isThinking={workspace.isThinking}>
                {composer}
              </AgentWelcome>
            </div>
          </div>
        )}
      </div>

      {isHistoryOpen ? (
        <div className="fixed inset-0 z-[200] lg:hidden">
          <button
            type="button"
            aria-label="Close conversation history"
            onClick={() => setIsHistoryOpen(false)}
            className="agent-scrim-in absolute inset-0 bg-[var(--modal-scrim)] backdrop-blur-[6px]"
          />
          <div className="agent-drawer-in absolute inset-y-0 left-0 w-[min(86vw,320px)] shadow-[0_30px_90px_rgba(10,8,6,0.28)]">
            <AgentSidebar {...sidebarProps} variant="drawer" onClose={() => setIsHistoryOpen(false)} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
