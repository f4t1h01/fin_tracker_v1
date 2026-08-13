"use client";

import { Check, PanelLeft, Pencil, Plus, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";

import { WorkspaceHeaderMenu } from "@/components/navigation/workspace-header-menu";

import { AgentIconButton } from "./agent-icon-button";

type AgentTopBarProps = {
  title: string;
  hasThread: boolean;
  onOpenHistory: () => void;
  onNewChat: () => void;
  onRename: (title: string) => void;
  onDelete: () => void;
};

export function AgentTopBar({ title, hasThread, onOpenHistory, onNewChat, onRename, onDelete }: AgentTopBarProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [draftTitle, setDraftTitle] = useState(title);

  useEffect(() => {
    setIsRenaming(false);
    setDraftTitle(title);
  }, [title]);

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b border-[rgba(201,168,76,0.12)] bg-[color-mix(in_srgb,var(--cream)_58%,transparent)] px-3 backdrop-blur-2xl sm:px-5">
      <AgentIconButton icon={PanelLeft} label="Open conversation history" onClick={onOpenHistory} className="lg:hidden" />

      {isRenaming ? (
        <form
          className="flex min-w-0 flex-1 items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            onRename(draftTitle);
            setIsRenaming(false);
          }}
        >
          <input
            autoFocus
            value={draftTitle}
            onChange={(event) => setDraftTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setDraftTitle(title);
                setIsRenaming(false);
              }
            }}
            aria-label="Conversation title"
            className="app-input min-w-0 flex-1"
          />
          <AgentIconButton icon={Check} label="Save title" type="submit" tone="active" />
          <AgentIconButton
            icon={X}
            label="Cancel rename"
            onClick={() => {
              setDraftTitle(title);
              setIsRenaming(false);
            }}
          />
        </form>
      ) : (
        <div className="min-w-0 flex-1 px-1">
          <p className="truncate text-[14px] font-semibold leading-tight text-[var(--ink)]">{title}</p>
          <p className="truncate text-[10px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">
            {hasThread ? "Conversation" : "New conversation"}
          </p>
        </div>
      )}

      {!isRenaming && hasThread ? (
        <>
          <AgentIconButton icon={Pencil} label="Rename conversation" onClick={() => setIsRenaming(true)} />
          <AgentIconButton icon={Trash2} label="Delete conversation" onClick={onDelete} />
        </>
      ) : null}

      {!isRenaming ? <AgentIconButton icon={Plus} label="New chat" onClick={onNewChat} className="lg:hidden" /> : null}

      <WorkspaceHeaderMenu className="ml-1" />
    </header>
  );
}
