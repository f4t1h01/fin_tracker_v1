"use client";

import {
  ArrowUp,
  Edit3,
  Menu,
  MessageSquareText,
  Pin,
  Plus,
  Trash2,
  X
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { WorkspacePageHeader } from "@/components/navigation/workspace-page-header";
import { goodsHeaderActionGroups } from "@/components/navigation/workspace-navigation";
import { useRouteTransitionPageReady } from "@/components/navigation/route-transition-provider";
import { ProfileLoadingState } from "@/components/profile/profile-loading-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import { TextareaField } from "@/components/ui/textarea-field";
import { useDismissableLayer } from "@/components/ui/use-dismissable-layer";
import { cn } from "@/lib/cn";

import type { GoodsAdvisorMessage, GoodsAdvisorThreadSummary, GoodsDinnerRecipeSuggestion } from "./types";
import { useGoodsAdvisorWorkspace } from "./use-goods-advisor-workspace";

const starterPrompts = [
  "What can I cook for dinner?",
  "Use the items that expire soon",
  "Give me a quick dinner for 2",
  "Suggest something healthy tonight"
];

function RecipeSuggestionCard(props: {
  label: string;
  recipe: GoodsDinnerRecipeSuggestion;
  showMissingItems?: boolean;
}) {
  return (
    <div className="rounded-[22px] border border-[rgba(201,168,76,0.14)] bg-[rgba(255,248,231,0.58)] p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="body-muted text-[10px] uppercase tracking-[0.18em]">{props.label}</p>
          <h4 className="mt-1 text-sm font-semibold sm:text-base">{props.recipe.title}</h4>
        </div>
        {props.recipe.recipePreview ? (
          <Button asChild size="sm" variant="outline" className="shrink-0 px-3 py-2 text-[11px]">
            <a href={props.recipe.recipePreview.url} target="_blank" rel="noreferrer">
              {props.recipe.recipePreview.label}
            </a>
          </Button>
        ) : null}
      </div>

      <p className="text-sm leading-6">{props.recipe.whyItFits}</p>

      <div className="mt-3 space-y-2">
        <p className="body-muted text-xs">
          Uses: {props.recipe.usesItems.join(", ") || "Limited pantry ingredients"}
        </p>
        {props.showMissingItems && props.recipe.missingItems.length ? (
          <p className="body-muted text-xs">Buy: {props.recipe.missingItems.join(", ")}</p>
        ) : null}
        {props.recipe.wasteReductionNotes.length ? (
          <p className="body-muted text-xs">Waste saver: {props.recipe.wasteReductionNotes.join(" ")}</p>
        ) : null}
      </div>

      <ol className="mt-3 space-y-2 text-sm">
        {props.recipe.steps.map((step, index) => (
          <li
            key={`${props.recipe.title}-${index}`}
            className="rounded-[18px] border border-[rgba(201,168,76,0.12)] px-3 py-2"
          >
            {index + 1}. {step}
          </li>
        ))}
      </ol>
    </div>
  );
}

function AssistantMessageBubble(props: { message: GoodsAdvisorMessage }) {
  const payload = props.message.payload;

  return (
    <div className="max-w-[94%] rounded-[26px] rounded-bl-[10px] border border-[rgba(201,168,76,0.2)] bg-[rgba(255,250,241,0.86)] px-4 py-4 shadow-[0_12px_30px_rgba(26,20,16,0.05)] sm:max-w-[88%]">
      <p className="text-sm leading-6">{props.message.text}</p>

      {payload?.warnings?.length ? (
        <div className="mt-3 space-y-1">
          {payload.warnings.map((warning, index) => (
            <p key={`${props.message.id}-warning-${index}`} className="body-muted text-xs">
              {warning}
            </p>
          ))}
        </div>
      ) : null}

      {payload ? (
        <div className="mt-4 grid gap-4 xl:grid-cols-3">
          <RecipeSuggestionCard label="Pantry meal 1" recipe={payload.pantryMeals[0]} />
          <RecipeSuggestionCard label="Pantry meal 2" recipe={payload.pantryMeals[1]} />
          <RecipeSuggestionCard label="Minimal buy" recipe={payload.minimalBuyMeal} showMissingItems />
        </div>
      ) : null}
    </div>
  );
}

function ThreadListSection(props: {
  label: string;
  threads: GoodsAdvisorThreadSummary[];
  activeThreadId: string | null;
  isMutatingThread: boolean;
  onOpen: (threadId: string) => void;
  onTogglePin: (thread: GoodsAdvisorThreadSummary) => void;
}) {
  if (!props.threads.length) {
    return null;
  }

  return (
    <div className="space-y-2">
      <p className="body-muted px-1 text-[10px] uppercase tracking-[0.18em]">{props.label}</p>
      <div className="space-y-2">
        {props.threads.map((thread) => {
          const isActive = props.activeThreadId === thread.id;

          return (
            <div
              key={thread.id}
              className={cn(
                "flex items-center gap-2 rounded-[18px] border px-3 py-2 transition-colors",
                isActive
                  ? "border-[var(--gold)] bg-[color-mix(in_srgb,var(--gold)_10%,transparent)]"
                  : "border-[rgba(201,168,76,0.12)] bg-[rgba(255,250,241,0.55)]"
              )}
            >
              <button
                type="button"
                title={thread.title}
                onClick={() => props.onOpen(thread.id)}
                className="min-w-0 flex-1 truncate text-left text-sm font-medium"
              >
                {thread.title}
              </button>
              <button
                type="button"
                title={thread.isPinned ? "Unpin chat" : "Pin chat"}
                aria-label={thread.isPinned ? "Unpin chat" : "Pin chat"}
                onClick={(event) => {
                  event.stopPropagation();
                  props.onTogglePin(thread);
                }}
                disabled={props.isMutatingThread}
                className={cn(
                  "inline-flex size-8 shrink-0 items-center justify-center rounded-full border transition-colors",
                  thread.isPinned
                    ? "border-[rgba(201,168,76,0.28)] bg-[color-mix(in_srgb,var(--gold)_12%,transparent)] text-[var(--gold)]"
                    : "border-[rgba(201,168,76,0.14)] text-[var(--ink-soft)] hover:text-[var(--ink)]"
                )}
              >
                <Pin className="size-3.5" fill={thread.isPinned ? "currentColor" : "none"} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function GoodsAdvisorPage() {
  const workspace = useGoodsAdvisorWorkspace();
  const isPageReady = workspace.isReady && (!workspace.token || Boolean(workspace.snapshot || workspace.error));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameDraft, setRenameDraft] = useState("");
  const drawerRef = useRef<HTMLDivElement | null>(null);
  const drawerButtonRef = useRef<HTMLButtonElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useRouteTransitionPageReady(isPageReady);
  useDismissableLayer({
    open: drawerOpen,
    onDismiss: () => setDrawerOpen(false),
    refs: [drawerRef, drawerButtonRef]
  });

  useEffect(() => {
    if (workspace.isReady && !workspace.token) {
      window.location.replace("/profile/me");
    }
  }, [workspace.isReady, workspace.token]);

  useEffect(() => {
    if (workspace.activeThread) {
      setRenameDraft(workspace.activeThread.thread.title);
      setIsRenaming(false);
    }
  }, [workspace.activeThread?.thread.id, workspace.activeThread?.thread.title]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: "end" });
  }, [workspace.activeThread?.messages, workspace.pendingUserText, workspace.isLoadingThread]);

  useEffect(() => {
    const textarea = composerRef.current;
    if (!textarea) {
      return;
    }

    const computedStyle = window.getComputedStyle(textarea);
    const parsedLineHeight = Number.parseFloat(computedStyle.lineHeight);
    const lineHeight = Number.isFinite(parsedLineHeight) ? parsedLineHeight : 24;
    const borderHeight =
      Number.parseFloat(computedStyle.borderTopWidth) + Number.parseFloat(computedStyle.borderBottomWidth);
    const paddingHeight =
      Number.parseFloat(computedStyle.paddingTop) + Number.parseFloat(computedStyle.paddingBottom);
    const maxHeight = lineHeight * 4 + borderHeight + paddingHeight;

    textarea.style.height = "auto";
    const nextHeight = Math.min(textarea.scrollHeight, maxHeight);
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? "auto" : "hidden";
    textarea.scrollTop = textarea.scrollHeight;
  }, [workspace.draftMessage]);

  const pinnedThreads = useMemo(() => workspace.threads.filter((item) => item.isPinned), [workspace.threads]);
  const recentThreads = useMemo(() => workspace.threads.filter((item) => !item.isPinned), [workspace.threads]);

  if (!workspace.isReady || (workspace.token && !workspace.snapshot && workspace.isLoadingThreads)) {
    return <ProfileLoadingState title="Preparing advisor" description="Loading your AI advisor conversations..." />;
  }

  if (!workspace.token || !workspace.snapshot) {
    return <ProfileLoadingState title="Loading advisor" description={workspace.error ?? "Checking advisor access..."} />;
  }

  const activeScope = workspace.activeThread?.thread.scope ?? workspace.newThreadScope;

  const handleOpenThread = (threadId: string) => {
    void workspace.loadThread(threadId);
    setDrawerOpen(false);
  };

  const handleTogglePin = (thread: GoodsAdvisorThreadSummary) => {
    void workspace.updateThread(thread.id, { isPinned: !thread.isPinned });
  };

  return (
    <main className="container-shell pb-16 pt-28">
      <WorkspacePageHeader eyebrow="My Goods" title="AI Advisor" actions={goodsHeaderActionGroups} />

      {workspace.error ? <p className="status-error mb-4 text-sm">{workspace.error}</p> : null}

      <Card className="panel-soft relative min-h-[76vh] overflow-hidden rounded-[32px]">
        {drawerOpen ? <div className="absolute inset-0 z-10 bg-[rgba(26,20,16,0.18)]" /> : null}

        <CardHeader className="relative z-20 border-b border-[rgba(201,168,76,0.12)]">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Button
                    ref={drawerButtonRef}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setDrawerOpen((current) => !current)}
                    className="gap-2 px-3 py-2 normal-case tracking-[0.08em]"
                  >
                    <Menu className="size-4" />
                    Recent chats
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={workspace.startNewChat}
                    className="size-10 rounded-full px-0 py-0"
                    title="New chat"
                    aria-label="New chat"
                  >
                    <Plus className="size-4" />
                  </Button>
                </div>

                {workspace.activeThread ? (
                  isRenaming ? (
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <TextField
                        value={renameDraft}
                        onChange={(event) => setRenameDraft(event.target.value)}
                        placeholder="Conversation title"
                      />
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            void workspace.updateThread(workspace.activeThread!.thread.id, {
                              title: renameDraft || null
                            });
                            setIsRenaming(false);
                          }}
                        >
                          Save
                        </Button>
                        <Button type="button" size="sm" variant="outline" onClick={() => setIsRenaming(false)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="eyebrow-row">Conversation</p>
                      <CardTitle className="text-[clamp(28px,3vw,38px)]">
                        {workspace.activeThread.thread.title}
                      </CardTitle>
                    </>
                  )
                ) : (
                  <>
                    <p className="eyebrow-row">Conversation</p>
                    <CardTitle className="text-[clamp(28px,3vw,38px)]">New chat</CardTitle>
                  </>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <SelectField
                  value={activeScope}
                  onChange={(event) => {
                    const nextScope = event.target.value as typeof activeScope;
                    if (workspace.activeThread) {
                      void workspace.updateThread(workspace.activeThread.thread.id, { scope: nextScope });
                    } else {
                      workspace.setNewThreadScope(nextScope);
                    }
                  }}
                  className="min-w-[180px]"
                >
                  <option value="AUTO">All available goods</option>
                  <option value="PERSONAL">Personal only</option>
                  {workspace.snapshot.workspace.hasPartnerConnection ? <option value="SHARED">Shared only</option> : null}
                </SelectField>

                {workspace.activeThread ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsRenaming(true)}
                      disabled={workspace.isMutatingThread}
                      className="size-10 rounded-full px-0 py-0"
                      title="Rename chat"
                      aria-label="Rename chat"
                    >
                      <Edit3 className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        void workspace.updateThread(workspace.activeThread!.thread.id, {
                          isPinned: !workspace.activeThread!.thread.isPinned
                        })
                      }
                      disabled={workspace.isMutatingThread}
                      className={cn(
                        "size-10 rounded-full px-0 py-0",
                        workspace.activeThread.thread.isPinned
                          ? "border-[rgba(201,168,76,0.3)] bg-[color-mix(in_srgb,var(--gold)_12%,transparent)] text-[var(--gold)]"
                          : undefined
                      )}
                      title={workspace.activeThread.thread.isPinned ? "Unpin chat" : "Pin chat"}
                      aria-label={workspace.activeThread.thread.isPinned ? "Unpin chat" : "Pin chat"}
                    >
                      <Pin
                        className="size-4"
                        fill={workspace.activeThread.thread.isPinned ? "currentColor" : "none"}
                      />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (window.confirm("Delete this conversation?")) {
                          void workspace.deleteThread(workspace.activeThread!.thread.id);
                        }
                      }}
                      disabled={workspace.isMutatingThread}
                      className="size-10 rounded-full px-0 py-0"
                      title="Delete chat"
                      aria-label="Delete chat"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </>
                ) : null}
              </div>
            </div>
          </div>

          <div
            ref={drawerRef}
            className={cn(
              "absolute left-5 top-[calc(100%-12px)] z-30 w-[min(92vw,360px)] rounded-[26px] border border-[rgba(201,168,76,0.16)] bg-[color-mix(in_srgb,var(--paper)_96%,white)] p-4 shadow-[0_24px_80px_rgba(26,20,16,0.18)] transition-all duration-200",
              drawerOpen ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0"
            )}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="eyebrow-row">Chats</p>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDrawerOpen(false)}
                className="size-8 rounded-full px-0 py-0"
                title="Close chats"
                aria-label="Close chats"
              >
                <X className="size-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <ThreadListSection
                label="Pinned"
                threads={pinnedThreads}
                activeThreadId={workspace.activeThreadId}
                isMutatingThread={workspace.isMutatingThread}
                onOpen={handleOpenThread}
                onTogglePin={handleTogglePin}
              />

              {recentThreads.length ? (
                <ThreadListSection
                  label="Recent"
                  threads={recentThreads}
                  activeThreadId={workspace.activeThreadId}
                  isMutatingThread={workspace.isMutatingThread}
                  onOpen={handleOpenThread}
                  onTogglePin={handleTogglePin}
                />
              ) : (
                <p className="body-muted px-1 text-sm">No chats yet.</p>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex min-h-[58vh] flex-col gap-0 p-0">
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5 sm:px-6">
            {!workspace.activeThread?.messages.length && !workspace.pendingUserText ? (
              <div className="space-y-4">
                <div className="rounded-[24px] border border-dashed border-[rgba(201,168,76,0.18)] bg-[rgba(255,250,241,0.42)] px-4 py-5">
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-[color-mix(in_srgb,var(--gold)_16%,transparent)] p-2">
                      <MessageSquareText className="size-5 text-[var(--gold)]" />
                    </div>
                    <p className="text-sm leading-6">Ask for dinner ideas, use expiring items, or keep the thread going.</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {starterPrompts.map((prompt) => (
                    <Button
                      key={prompt}
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={workspace.isSending}
                      onClick={() => void workspace.sendMessage(prompt)}
                    >
                      {prompt}
                    </Button>
                  ))}
                </div>
              </div>
            ) : null}

            {workspace.activeThread?.messages.map((message) =>
              message.role === "USER" ? (
                <div key={message.id} className="flex justify-end">
                  <div className="max-w-[85%] rounded-[26px] rounded-br-[10px] bg-[color-mix(in_srgb,var(--ink)_96%,black)] px-4 py-3 text-sm leading-6 text-[var(--paper)] shadow-[0_14px_32px_rgba(26,20,16,0.16)] sm:max-w-[70%]">
                    {message.text}
                  </div>
                </div>
              ) : (
                <div key={message.id} className="flex justify-start">
                  <AssistantMessageBubble message={message} />
                </div>
              )
            )}

            {workspace.pendingUserText ? (
              <>
                <div className="flex justify-end">
                  <div className="max-w-[85%] rounded-[26px] rounded-br-[10px] bg-[color-mix(in_srgb,var(--ink)_96%,black)] px-4 py-3 text-sm leading-6 text-[var(--paper)] shadow-[0_14px_32px_rgba(26,20,16,0.16)] sm:max-w-[70%]">
                    {workspace.pendingUserText}
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="max-w-[94%] rounded-[26px] rounded-bl-[10px] border border-[rgba(201,168,76,0.18)] bg-[rgba(255,250,241,0.82)] px-4 py-3 text-sm sm:max-w-[88%]">
                    Thinking through your pantry...
                  </div>
                </div>
              </>
            ) : null}

            {workspace.isLoadingThread ? <p className="body-muted text-sm">Loading conversation...</p> : null}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-[rgba(201,168,76,0.12)] px-4 py-4 sm:px-5">
            <div className="rounded-[26px] border border-[rgba(201,168,76,0.16)] bg-[rgba(255,250,241,0.72)] px-3 py-3">
              <div className="flex items-end gap-3">
                <TextareaField
                  ref={composerRef}
                  value={workspace.draftMessage}
                  onChange={(event) => workspace.setDraftMessage(event.target.value)}
                  placeholder="Ask what to cook next..."
                  rows={1}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void workspace.sendMessage();
                    }
                  }}
                  className="max-h-[112px] min-h-[24px] flex-1 resize-none overflow-y-hidden border-none bg-transparent px-1 py-0.5 text-sm leading-6 shadow-none focus-visible:ring-0"
                />
                <Button
                  type="button"
                  disabled={workspace.isSending}
                  onClick={() => void workspace.sendMessage()}
                  className="flex size-10 shrink-0 items-center justify-center rounded-full px-0 py-0"
                  title={workspace.isSending ? "Sending" : "Send message"}
                  aria-label={workspace.isSending ? "Sending" : "Send message"}
                >
                  <ArrowUp className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
