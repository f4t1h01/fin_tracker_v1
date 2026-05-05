"use client";

import { ArrowLeft, ArrowUp, Edit3, MessageSquareText, Pin, Plus, Trash2, X } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { WorkspacePageHeader } from "@/components/navigation/workspace-page-header";
import { goodsHeaderActionGroups } from "@/components/navigation/workspace-navigation";
import { useRouteTransitionPageReady } from "@/components/navigation/route-transition-provider";
import { ProfileLoadingState } from "@/components/profile/profile-loading-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import { TextareaField } from "@/components/ui/textarea-field";
import { cn } from "@/lib/cn";

import type {
  GoodsAdvisorMessage,
  GoodsAdvisorScope,
  GoodsAdvisorThreadSummary,
  GoodsDinnerRecipeSuggestion
} from "./types";
import { useGoodsAdvisorWorkspace } from "./use-goods-advisor-workspace";

const starterPrompts = [
  "What can I cook for dinner?",
  "Use the items that expire soon",
  "Give me a quick dinner for 2",
  "Suggest something healthy tonight"
];

const COMPOSER_MAX_ROWS = 4;

function formatThreadDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function RecipeSuggestionCard(props: {
  label: string;
  recipe: GoodsDinnerRecipeSuggestion;
  showMissingItems?: boolean;
}) {
  return (
    <div className="rounded-[22px] border border-[rgba(201,168,76,0.14)] bg-[color-mix(in_srgb,var(--surface-glass-strong)_82%,transparent)] p-4 text-[var(--ink)]">
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
          <li key={`${props.recipe.title}-${index}`} className="rounded-[18px] border border-[rgba(201,168,76,0.12)] px-3 py-2">
            {index + 1}. {step}
          </li>
        ))}
      </ol>
    </div>
  );
}

function AssistantMessageBubble(props: { message: GoodsAdvisorMessage }) {
  const payload = props.message.payload;
  const dinnerPayload = payload?.mode === "DINNER_RECOMMENDATION" ? payload : null;

  return (
    <div className="max-w-[94%] rounded-[26px] rounded-bl-[10px] border border-[rgba(201,168,76,0.18)] bg-[var(--surface-glass-strong)] px-4 py-4 text-[var(--ink)] shadow-[0_12px_30px_rgba(26,20,16,0.05)] sm:max-w-[88%]">
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

      {dinnerPayload && dinnerPayload.minimalBuyMeal ? (
        <div className="mt-4 grid gap-4 xl:grid-cols-3">
          <RecipeSuggestionCard label="Pantry meal 1" recipe={dinnerPayload.pantryMeals[0]} />
          <RecipeSuggestionCard label="Pantry meal 2" recipe={dinnerPayload.pantryMeals[1]} />
          <RecipeSuggestionCard label="Minimal buy" recipe={dinnerPayload.minimalBuyMeal} showMissingItems />
        </div>
      ) : null}
    </div>
  );
}

function UserMessageBubble(props: { text: string }) {
  return (
    <div className="max-w-[85%] rounded-[26px] rounded-br-[10px] bg-[color-mix(in_srgb,var(--ink)_92%,var(--gold)_8%)] px-4 py-3 text-sm leading-6 text-[var(--cream)] shadow-[0_14px_32px_rgba(26,20,16,0.16)] sm:max-w-[70%]">
      {props.text}
    </div>
  );
}

function ThreadListSection(props: {
  label: string;
  threads: GoodsAdvisorThreadSummary[];
  activeThreadId: string | null;
  deletingThreadIds: Set<string>;
  isMutatingThread: boolean;
  onOpen: (threadId: string) => void;
  onTogglePin: (thread: GoodsAdvisorThreadSummary) => void;
  onDelete: (thread: GoodsAdvisorThreadSummary) => void;
}) {
  if (!props.threads.length) {
    return null;
  }

  return (
    <section className="space-y-3">
      <p className="body-muted px-1 text-[11px] uppercase tracking-[0.18em]">{props.label}</p>
      <div className="grid gap-3">
        {props.threads.map((thread) => {
          const isActive = props.activeThreadId === thread.id;
          const isDeleting = props.deletingThreadIds.has(thread.id);

          return (
            <div
              key={thread.id}
              className={cn(
                "group flex min-h-[76px] items-center gap-3 rounded-[20px] border px-4 py-3 transition-colors",
                isActive
                  ? "border-[var(--gold)] bg-[color-mix(in_srgb,var(--gold)_10%,var(--surface-glass-strong))]"
                  : "border-[rgba(201,168,76,0.14)] bg-[var(--surface-glass)] hover:border-[rgba(201,168,76,0.28)] hover:bg-[var(--surface-glass-strong)]",
                isDeleting ? "opacity-55" : ""
              )}
            >
              <button
                type="button"
                title={thread.title}
                onClick={() => props.onOpen(thread.id)}
                disabled={isDeleting}
                className="min-w-0 flex-1 text-left disabled:cursor-not-allowed"
              >
                <span className="block truncate text-sm font-semibold text-[var(--ink)]">{thread.title}</span>
                <span className="mt-1 block truncate text-xs leading-5 text-[var(--ink-soft)]">
                  {thread.lastMessagePreview || "No messages yet"}
                </span>
                <span className="mt-1 block text-[11px] uppercase tracking-[0.12em] text-[var(--ink-soft)]">
                  {formatThreadDate(thread.lastActivityAt)}
                </span>
              </button>

              <button
                type="button"
                title={thread.isPinned ? "Unpin chat" : "Pin chat"}
                aria-label={thread.isPinned ? "Unpin chat" : "Pin chat"}
                onClick={() => props.onTogglePin(thread)}
                disabled={props.isMutatingThread || isDeleting}
                className={cn(
                  "inline-flex size-9 shrink-0 items-center justify-center rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                  thread.isPinned
                    ? "border-[rgba(201,168,76,0.32)] bg-[color-mix(in_srgb,var(--gold)_12%,var(--surface-glass))] text-[var(--gold)]"
                    : "border-[rgba(201,168,76,0.18)] bg-[color-mix(in_srgb,var(--surface-glass)_82%,transparent)] text-[var(--ink-soft)] hover:text-[var(--ink)]"
                )}
              >
                <Pin className="size-3.5" fill={thread.isPinned ? "currentColor" : "none"} />
              </button>

              <button
                type="button"
                title={isDeleting ? "Deleting chat" : "Delete chat"}
                aria-label={isDeleting ? "Deleting chat" : "Delete chat"}
                onClick={() => props.onDelete(thread)}
                disabled={isDeleting}
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-[rgba(201,168,76,0.18)] bg-[color-mix(in_srgb,var(--surface-glass)_82%,transparent)] text-[var(--ink-soft)] transition-colors hover:text-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function GoodsAdvisorPage() {
  const workspace = useGoodsAdvisorWorkspace();
  const isPageReady = workspace.isReady && (!workspace.token || Boolean(workspace.snapshot || workspace.error));
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameDraft, setRenameDraft] = useState("");
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useRouteTransitionPageReady(isPageReady);

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
    if (!workspace.isChatOpen) {
      setIsRenaming(false);
    }
  }, [workspace.isChatOpen]);

  useEffect(() => {
    if (!workspace.isChatOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        workspace.closeChat();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [workspace.isChatOpen, workspace.closeChat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: "end" });
  }, [workspace.activeThread?.messages, workspace.pendingUserText, workspace.isLoadingThread, workspace.isChatOpen]);

  useLayoutEffect(() => {
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
    const minHeight = lineHeight + borderHeight + paddingHeight;
    const maxHeight = lineHeight * COMPOSER_MAX_ROWS + borderHeight + paddingHeight;

    textarea.style.height = "auto";
    const nextHeight = Math.max(minHeight, Math.min(textarea.scrollHeight, maxHeight));
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? "auto" : "hidden";
    textarea.scrollTop = textarea.scrollHeight;
  }, [workspace.draftMessage, workspace.isChatOpen]);

  const pinnedThreads = useMemo(() => workspace.threads.filter((item) => item.isPinned), [workspace.threads]);
  const recentThreads = useMemo(() => workspace.threads.filter((item) => !item.isPinned), [workspace.threads]);
  const activeThreadSummary = useMemo(
    () => workspace.threads.find((thread) => thread.id === workspace.activeThreadId) ?? null,
    [workspace.activeThreadId, workspace.threads]
  );

  if (!workspace.isReady || (workspace.token && !workspace.snapshot && workspace.isLoadingThreads)) {
    return <ProfileLoadingState title="Preparing advisor" description="Loading your AI advisor conversations..." />;
  }

  if (!workspace.token || !workspace.snapshot) {
    return <ProfileLoadingState title="Loading advisor" description={workspace.error ?? "Checking advisor access..."} />;
  }

  const activeTitle = workspace.activeThread?.thread.title ?? activeThreadSummary?.title ?? "New chat";
  const activeScope = (workspace.activeThread?.thread.scope ?? activeThreadSummary?.scope ?? workspace.newThreadScope) as GoodsAdvisorScope;
  const hasMessages = Boolean(workspace.activeThread?.messages.length || workspace.pendingUserText);

  const handleTogglePin = (thread: GoodsAdvisorThreadSummary) => {
    void workspace.updateThread(thread.id, { isPinned: !thread.isPinned });
  };

  const handleDeleteThread = (thread: GoodsAdvisorThreadSummary) => {
    if (window.confirm("Delete this conversation?")) {
      void workspace.deleteThread(thread.id);
    }
  };

  const handleScopeChange = (nextScope: GoodsAdvisorScope) => {
    if (workspace.activeThreadId) {
      void workspace.updateThread(workspace.activeThreadId, { scope: nextScope });
    } else {
      workspace.setNewThreadScope(nextScope);
    }
  };

  return (
    <main className="container-shell pb-16 pt-28">
      <WorkspacePageHeader eyebrow="My Goods" title="AI Advisor" actions={goodsHeaderActionGroups} />

      <div aria-live="polite" className="mb-4 min-h-5">
        {workspace.statusMessage ? <p className="status-success text-sm">{workspace.statusMessage}</p> : null}
        {workspace.error ? <p className="status-error text-sm">{workspace.error}</p> : null}
      </div>

      <div className={cn("transition-[filter,opacity] duration-300", workspace.isChatOpen ? "opacity-45 blur-[1px]" : "")}>
        <Card className="panel-soft rounded-[28px]">
          <CardContent className="space-y-6 p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="max-w-2xl space-y-2">
                <p className="eyebrow-row">Recent chats</p>
                <CardTitle className="text-[clamp(28px,3vw,38px)]">Pick up where you left off</CardTitle>
                <p className="body-muted text-sm leading-6">
                  Open a previous pantry conversation or start a clean thread for tonight.
                </p>
              </div>

              <Button type="button" onClick={workspace.startNewChat} className="shrink-0">
                <Plus className="size-4" />
                New chat
              </Button>
            </div>

            {workspace.isLoadingThreads ? <p className="body-muted text-sm">Refreshing conversations...</p> : null}

            <div className="space-y-6">
              <ThreadListSection
                label="Pinned"
                threads={pinnedThreads}
                activeThreadId={workspace.activeThreadId}
                deletingThreadIds={workspace.deletingThreadIds}
                isMutatingThread={workspace.isMutatingThread}
                onOpen={workspace.openThread}
                onTogglePin={handleTogglePin}
                onDelete={handleDeleteThread}
              />

              {recentThreads.length ? (
                <ThreadListSection
                  label="Recent"
                  threads={recentThreads}
                  activeThreadId={workspace.activeThreadId}
                  deletingThreadIds={workspace.deletingThreadIds}
                  isMutatingThread={workspace.isMutatingThread}
                  onOpen={workspace.openThread}
                  onTogglePin={handleTogglePin}
                  onDelete={handleDeleteThread}
                />
              ) : pinnedThreads.length ? null : (
                <div className="rounded-[24px] border border-dashed border-[rgba(201,168,76,0.2)] bg-[var(--surface-glass)] px-5 py-8">
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-[color-mix(in_srgb,var(--gold)_16%,transparent)] p-2">
                      <MessageSquareText className="size-5 text-[var(--gold)]" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-[var(--ink)]">No chats yet</p>
                      <p className="body-muted text-sm leading-6">
                        Start with a dinner idea, expiring items, or a quick pantry question.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {workspace.isChatOpen ? (
        <div className="fixed inset-0 z-[180] flex items-stretch justify-center bg-[var(--modal-scrim)] p-0 backdrop-blur-[14px] backdrop-saturate-150 sm:p-6">
          <section className="relative flex h-[100dvh] w-full flex-col overflow-hidden border border-[rgba(201,168,76,0.16)] bg-[var(--warm-white)] text-[var(--ink)] shadow-[0_30px_110px_rgba(10,8,6,0.28)] sm:h-[min(860px,calc(100dvh-3rem))] sm:max-w-5xl sm:rounded-[28px]">
            <div className="relative z-20 border-b border-[rgba(201,168,76,0.12)] bg-[color-mix(in_srgb,var(--warm-white)_86%,transparent)] px-4 py-3 backdrop-blur-xl sm:px-5">
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={workspace.closeChat}
                  className="size-10 shrink-0 rounded-full px-0 py-0"
                  title="Back to recent chats"
                  aria-label="Back to recent chats"
                >
                  <ArrowLeft className="size-5" />
                </Button>

                <div className="min-w-0 flex-1">
                  {isRenaming && workspace.activeThread ? (
                    <div className="flex min-w-0 items-center gap-2">
                      <TextField
                        value={renameDraft}
                        onChange={(event) => setRenameDraft(event.target.value)}
                        placeholder="Conversation title"
                        className="h-10 min-w-0 flex-1"
                      />
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
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setIsRenaming(false)}
                        className="size-10 rounded-full px-0 py-0"
                        title="Cancel rename"
                        aria-label="Cancel rename"
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <p className="truncate text-sm font-semibold text-[var(--ink)]">{activeTitle}</p>
                      <p className="body-muted truncate text-xs">
                        {workspace.activeThreadId ? "Conversation" : "New conversation"}
                      </p>
                    </>
                  )}
                </div>

                {workspace.activeThread ? (
                  <>
                    <Button
                      type="button"
                      variant="ghost"
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
                      variant="ghost"
                      onClick={() => handleDeleteThread(workspace.activeThread!.thread)}
                      disabled={workspace.deletingThreadIds.has(workspace.activeThread.thread.id)}
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

            <div className="pointer-events-none absolute inset-x-0 top-[65px] z-10 h-20 bg-gradient-to-b from-[var(--warm-white)] via-[color-mix(in_srgb,var(--warm-white)_82%,transparent)] to-transparent" />

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-6 pt-7 sm:px-8">
              {!hasMessages && !workspace.isLoadingThread ? (
                <div className="mx-auto flex min-h-[48vh] max-w-2xl flex-col justify-center gap-5">
                  <div className="rounded-[24px] border border-dashed border-[rgba(201,168,76,0.2)] bg-[var(--surface-glass)] px-4 py-5">
                    <div className="flex items-start gap-3">
                      <div className="rounded-full bg-[color-mix(in_srgb,var(--gold)_16%,transparent)] p-2">
                        <MessageSquareText className="size-5 text-[var(--gold)]" />
                      </div>
                      <p className="text-sm leading-6 text-[var(--ink)]">
                        Ask for dinner ideas, use expiring items, or keep the thread going.
                      </p>
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
                    <UserMessageBubble text={message.text} />
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
                    <UserMessageBubble text={workspace.pendingUserText} />
                  </div>
                  <div className="flex justify-start">
                    <div className="max-w-[94%] rounded-[26px] rounded-bl-[10px] border border-[rgba(201,168,76,0.18)] bg-[var(--surface-glass-strong)] px-4 py-3 text-sm text-[var(--ink)] sm:max-w-[88%]">
                      Thinking through your pantry...
                    </div>
                  </div>
                </>
              ) : null}

              {workspace.isLoadingThread ? <p className="body-muted text-sm">Loading conversation...</p> : null}
              <div ref={messagesEndRef} />
            </div>

            <div className="border-t border-[rgba(201,168,76,0.12)] bg-[color-mix(in_srgb,var(--warm-white)_92%,transparent)] px-4 py-3 backdrop-blur-xl sm:px-5 sm:py-4">
              <div className="mx-auto flex max-w-4xl flex-col gap-3">
                <SelectField
                  value={activeScope}
                  onChange={(event) => handleScopeChange(event.target.value as GoodsAdvisorScope)}
                  className="h-10 min-w-[180px] self-start"
                  disabled={workspace.isSending || workspace.isLoadingThread}
                >
                  <option value="AUTO">All available goods</option>
                  <option value="PERSONAL">Personal only</option>
                  {workspace.snapshot.workspace.hasPartnerConnection ? <option value="SHARED">Shared only</option> : null}
                </SelectField>

                <div className="flex items-end gap-3 rounded-[24px] border border-[rgba(201,168,76,0.18)] bg-[var(--surface-glass-strong)] px-3 py-2.5 shadow-[0_12px_28px_rgba(26,20,16,0.06)]">
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
                    className="max-h-[124px] min-h-[50px] flex-1 resize-none overflow-y-hidden border-none bg-transparent px-1 py-[13px] text-sm leading-6 text-[var(--ink)] shadow-none outline-none placeholder:text-[var(--ink-soft)] focus-visible:ring-0"
                    style={{ resize: "none" }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={workspace.isSending}
                    onClick={() => void workspace.sendMessage()}
                    className="flex size-10 shrink-0 items-center justify-center rounded-full border-[rgba(201,168,76,0.2)] bg-[var(--ink)] px-0 py-0 text-[var(--cream)] shadow-[0_10px_24px_rgba(26,20,16,0.14)] hover:border-[var(--gold)] hover:bg-[color-mix(in_srgb,var(--ink)_92%,var(--gold)_8%)] hover:text-[var(--cream)]"
                    title={workspace.isSending ? "Sending" : "Send message"}
                    aria-label={workspace.isSending ? "Sending" : "Send message"}
                  >
                    <ArrowUp className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
