"use client";

import { Edit3, Menu, MessageSquareText, Pin, PinOff, Plus, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { AppLink } from "@/components/navigation/app-link";
import { WorkspacePageHeader } from "@/components/navigation/workspace-page-header";
import { goodsHeaderActionGroups, workspaceRoutes } from "@/components/navigation/workspace-navigation";
import { useRouteTransitionPageReady } from "@/components/navigation/route-transition-provider";
import { ProfileLoadingState } from "@/components/profile/profile-loading-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import { TextareaField } from "@/components/ui/textarea-field";
import { useDismissableLayer } from "@/components/ui/use-dismissable-layer";
import { cn } from "@/lib/cn";

import type { GoodsAdvisorMessage, GoodsDinnerRecipeSuggestion } from "./types";
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
    <div className="rounded-[24px] border border-[rgba(201,168,76,0.16)] bg-[rgba(255,248,231,0.56)] p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="body-muted text-[11px] uppercase tracking-[0.18em]">{props.label}</p>
          <h4 className="mt-1 text-base font-semibold">{props.recipe.title}</h4>
        </div>
        {props.recipe.recipePreview ? (
          <Button asChild size="sm" variant="outline">
            <a href={props.recipe.recipePreview.url} target="_blank" rel="noreferrer">
              {props.recipe.recipePreview.label}
            </a>
          </Button>
        ) : null}
      </div>

      <p className="text-sm leading-6">{props.recipe.whyItFits}</p>
      <p className="body-muted mt-3 text-xs">Uses: {props.recipe.usesItems.join(", ") || "Limited pantry ingredients"}</p>
      {props.showMissingItems && props.recipe.missingItems.length ? <p className="body-muted mt-2 text-xs">Buy: {props.recipe.missingItems.join(", ")}</p> : null}
      {props.recipe.wasteReductionNotes.length ? <p className="body-muted mt-2 text-xs">Waste saver: {props.recipe.wasteReductionNotes.join(" ")}</p> : null}

      <ol className="mt-3 space-y-2 text-sm">
        {props.recipe.steps.map((step, index) => (
          <li key={`${props.recipe.title}-${index}`} className="rounded-2xl border border-[rgba(201,168,76,0.12)] px-3 py-2">
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
    <div className="max-w-[94%] rounded-[30px] border border-[rgba(201,168,76,0.2)] bg-[rgba(255,250,241,0.82)] px-4 py-4">
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

export function GoodsAdvisorPage() {
  const workspace = useGoodsAdvisorWorkspace();
  const isPageReady = workspace.isReady && (!workspace.token || Boolean(workspace.snapshot || workspace.error));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameDraft, setRenameDraft] = useState("");
  const drawerRef = useRef<HTMLDivElement | null>(null);
  const drawerButtonRef = useRef<HTMLButtonElement | null>(null);

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

  const pinnedThreads = useMemo(() => workspace.threads.filter((item) => item.isPinned), [workspace.threads]);
  const recentThreads = useMemo(() => workspace.threads.filter((item) => !item.isPinned), [workspace.threads]);

  if (!workspace.isReady || (workspace.token && !workspace.snapshot && workspace.isLoadingThreads)) {
    return <ProfileLoadingState title="Preparing advisor" description="Loading your AI advisor conversations..." />;
  }

  if (!workspace.token || !workspace.snapshot) {
    return <ProfileLoadingState title="Loading advisor" description={workspace.error ?? "Checking advisor access..."} />;
  }

  const activeScope = workspace.activeThread?.thread.scope ?? workspace.newThreadScope;

  return (
    <main className="container-shell pb-16 pt-28">
      <WorkspacePageHeader
        eyebrow="My Goods"
        title="AI Advisor"
        description="Hold a real conversation about dinner ideas from your pantry. Threads stay for 7 days unless you pin them permanently."
        actions={goodsHeaderActionGroups}
      />

      {workspace.error ? <p className="status-error mb-4 text-sm">{workspace.error}</p> : null}

      <section className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className="flex items-center justify-between gap-3 xl:hidden">
          <Button ref={drawerButtonRef} type="button" variant="outline" onClick={() => setDrawerOpen(true)}>
            <Menu className="size-4" />
            Conversations
          </Button>
          <Button type="button" variant="outline" onClick={workspace.startNewChat}>
            <Plus className="size-4" />
            New chat
          </Button>
        </div>

        <aside
          ref={drawerRef}
          className={cn(
            "fixed inset-y-0 left-0 z-40 w-[min(88vw,360px)] overflow-y-auto border-r border-[rgba(201,168,76,0.14)] bg-[color-mix(in_srgb,var(--paper)_94%,white)] p-4 shadow-[0_30px_80px_rgba(26,20,16,0.22)] transition-transform duration-300 xl:static xl:w-auto xl:translate-x-0 xl:rounded-[32px] xl:border xl:bg-[var(--card-bg)] xl:p-5 xl:shadow-[0_16px_48px_rgba(26,20,16,0.08)]",
            drawerOpen ? "translate-x-0" : "-translate-x-full xl:translate-x-0"
          )}
        >
          <div className="mb-4 flex items-center justify-between gap-3 xl:hidden">
            <p className="eyebrow-row">Advisor chats</p>
            <Button type="button" variant="ghost" onClick={() => setDrawerOpen(false)}>
              <X className="size-4" />
            </Button>
          </div>

          <div className="mb-4 hidden xl:flex xl:items-center xl:justify-between xl:gap-3">
            <p className="eyebrow-row">Advisor chats</p>
            <Button type="button" variant="outline" size="sm" onClick={workspace.startNewChat}>
              <Plus className="size-4" />
              New chat
            </Button>
          </div>

          <div className="space-y-5">
            {pinnedThreads.length ? (
              <div className="space-y-2">
                <p className="body-muted text-[11px] uppercase tracking-[0.16em]">Pinned</p>
                <div className="space-y-2">
                  {pinnedThreads.map((thread) => (
                    <button
                      key={thread.id}
                      type="button"
                      onClick={() => {
                        void workspace.loadThread(thread.id);
                        setDrawerOpen(false);
                      }}
                      className={cn(
                        "w-full rounded-[24px] border px-4 py-3 text-left transition-colors",
                        workspace.activeThreadId === thread.id
                          ? "border-[var(--gold)] bg-[color-mix(in_srgb,var(--gold)_10%,transparent)]"
                          : "border-[rgba(201,168,76,0.12)] bg-transparent"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-medium">{thread.title}</p>
                        <Pin className="mt-0.5 size-3.5 text-[var(--gold)]" />
                      </div>
                      <p className="body-muted mt-2 line-clamp-2 text-xs">{thread.lastMessagePreview ?? "No messages yet"}</p>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="space-y-2">
              <p className="body-muted text-[11px] uppercase tracking-[0.16em]">Recent</p>
              <div className="space-y-2">
                {recentThreads.length ? (
                  recentThreads.map((thread) => (
                    <button
                      key={thread.id}
                      type="button"
                      onClick={() => {
                        void workspace.loadThread(thread.id);
                        setDrawerOpen(false);
                      }}
                      className={cn(
                        "w-full rounded-[24px] border px-4 py-3 text-left transition-colors",
                        workspace.activeThreadId === thread.id
                          ? "border-[var(--gold)] bg-[color-mix(in_srgb,var(--gold)_10%,transparent)]"
                          : "border-[rgba(201,168,76,0.12)] bg-transparent"
                      )}
                    >
                      <p className="font-medium">{thread.title}</p>
                      <p className="body-muted mt-2 line-clamp-2 text-xs">{thread.lastMessagePreview ?? "No messages yet"}</p>
                    </button>
                  ))
                ) : (
                  <div className="rounded-[24px] border border-dashed border-[rgba(201,168,76,0.18)] px-4 py-4 text-sm">
                    No recent chats yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        </aside>

        {drawerOpen ? <div className="fixed inset-0 z-30 bg-[rgba(26,20,16,0.28)] xl:hidden" /> : null}

        <Card className="panel-soft min-h-[70vh] overflow-hidden rounded-[32px]">
          <CardHeader className="border-b border-[rgba(201,168,76,0.12)]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                {workspace.activeThread ? (
                  isRenaming ? (
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <TextField value={renameDraft} onChange={(event) => setRenameDraft(event.target.value)} placeholder="Conversation title" />
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            void workspace.updateThread(workspace.activeThread!.thread.id, { title: renameDraft || null });
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
                      <CardTitle className="text-[clamp(28px,3vw,38px)]">{workspace.activeThread.thread.title}</CardTitle>
                    </>
                  )
                ) : (
                  <>
                    <p className="eyebrow-row">New conversation</p>
                    <CardTitle className="text-[clamp(28px,3vw,38px)]">Start a fresh pantry chat</CardTitle>
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
                    <Button type="button" variant="outline" size="sm" onClick={() => setIsRenaming(true)} disabled={workspace.isMutatingThread}>
                      <Edit3 className="size-4" />
                      Rename
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
                    >
                      {workspace.activeThread.thread.isPinned ? <PinOff className="size-4" /> : <Pin className="size-4" />}
                      {workspace.activeThread.thread.isPinned ? "Unpin" : "Pin"}
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
                    >
                      <Trash2 className="size-4" />
                      Delete
                    </Button>
                  </>
                ) : (
                  <Button type="button" variant="outline" size="sm" onClick={workspace.startNewChat}>
                    <Plus className="size-4" />
                    Reset draft
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex min-h-[54vh] flex-col gap-4 p-0">
            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
              {!workspace.activeThread?.messages.length && !workspace.pendingUserText ? (
                <div className="space-y-4">
                  <div className="rounded-[28px] border border-dashed border-[rgba(201,168,76,0.22)] px-5 py-6">
                    <div className="flex items-start gap-3">
                      <div className="rounded-full bg-[color-mix(in_srgb,var(--gold)_16%,transparent)] p-2">
                        <MessageSquareText className="size-5 text-[var(--gold)]" />
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm leading-6">
                          Ask naturally about dinner and keep the conversation going. This route is separate from inventory so it behaves like a real chat, not a one-off form.
                        </p>
                        <p className="body-muted text-xs">
                          Non-pinned chats are kept for 7 days. Pin a useful one to keep it permanently.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {starterPrompts.map((prompt) => (
                      <Button key={prompt} type="button" variant="outline" size="sm" disabled={workspace.isSending} onClick={() => void workspace.sendMessage(prompt)}>
                        {prompt}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : null}

              {workspace.activeThread?.messages.map((message) =>
                message.role === "USER" ? (
                  <div key={message.id} className="flex justify-end">
                    <div className="max-w-[85%] rounded-[30px] bg-[var(--ink)] px-4 py-3 text-sm text-[var(--paper)]">{message.text}</div>
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
                    <div className="max-w-[85%] rounded-[30px] bg-[var(--ink)] px-4 py-3 text-sm text-[var(--paper)]">{workspace.pendingUserText}</div>
                  </div>
                  <div className="flex justify-start">
                    <div className="rounded-[30px] border border-[rgba(201,168,76,0.18)] px-4 py-3 text-sm">
                      Thinking through your pantry and recent chat...
                    </div>
                  </div>
                </>
              ) : null}

              {workspace.isLoadingThread ? <p className="body-muted text-sm">Loading conversation…</p> : null}
            </div>

            <div className="border-t border-[rgba(201,168,76,0.12)] px-5 py-4">
              <div className="rounded-[28px] border border-[rgba(201,168,76,0.16)] bg-[rgba(255,250,241,0.68)] p-3">
                <TextareaField
                  value={workspace.draftMessage}
                  onChange={(event) => workspace.setDraftMessage(event.target.value)}
                  placeholder="Ask about dinner, leftovers, quick meals, or what to cook next..."
                  rows={3}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void workspace.sendMessage();
                    }
                  }}
                  className="min-h-[96px] border-none bg-transparent px-0 py-0 shadow-none focus-visible:ring-0"
                />
                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className="body-muted text-xs">
                    Need inventory setup first? <AppLink href={workspaceRoutes.goods}>Go back to My Goods</AppLink>
                  </p>
                  <Button type="button" disabled={workspace.isSending} onClick={() => void workspace.sendMessage()}>
                    {workspace.isSending ? "Sending..." : "Send"}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
