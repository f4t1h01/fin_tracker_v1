"use client";

import { useEffect } from "react";

import { WorkspacePageHeader } from "@/components/navigation/workspace-page-header";
import { goodsHeaderActionGroups } from "@/components/navigation/workspace-navigation";
import { useRouteTransitionPageReady } from "@/components/navigation/route-transition-provider";
import { ProfileLoadingState } from "@/components/profile/profile-loading-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import { TextareaField } from "@/components/ui/textarea-field";

import { useGoodsWorkspace } from "./use-goods-workspace";

const advisorStarterPrompts = [
  "What can I cook for dinner?",
  "Give me a quick dinner for 2",
  "Use items that expire soon",
  "Suggest something healthy tonight"
];

function RecipeSuggestionCard(props: {
  heading: string;
  recipe: {
    title: string;
    whyItFits: string;
    usesItems: string[];
    missingItems: string[];
    steps: string[];
    wasteReductionNotes: string[];
    recipePreview: {
      label: string;
      url: string;
      sourceLabel: string;
    } | null;
  };
  showMissingItems?: boolean;
}) {
  return (
    <div className="rounded-[28px] border border-[rgba(201,168,76,0.16)] bg-[rgba(255,248,231,0.5)] p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="body-muted text-[11px] uppercase tracking-[0.18em]">{props.heading}</p>
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
      <p className="body-muted mt-3 text-xs">Uses: {props.recipe.usesItems.join(", ") || "Tracked goods are limited"}</p>
      {props.showMissingItems && props.recipe.missingItems.length ? (
        <p className="body-muted mt-2 text-xs">Buy: {props.recipe.missingItems.join(", ")}</p>
      ) : null}
      {props.recipe.wasteReductionNotes.length ? (
        <p className="body-muted mt-2 text-xs">Waste saver: {props.recipe.wasteReductionNotes.join(" ")}</p>
      ) : null}

      <ol className="mt-3 space-y-2 text-sm">
        {props.recipe.steps.map((step, index) => (
          <li key={`${props.recipe.title}-${index}`} className="rounded-2xl border border-[rgba(201,168,76,0.12)] px-3 py-2">
            {index + 1}. {step}
          </li>
        ))}
      </ol>
      {props.recipe.recipePreview ? <p className="body-muted mt-3 text-[11px] uppercase tracking-[0.14em]">{props.recipe.recipePreview.sourceLabel}</p> : null}
    </div>
  );
}

export function GoodsOverviewPage() {
  const workspace = useGoodsWorkspace();
  const isPageReady = workspace.isReady && (!workspace.token || Boolean(workspace.snapshot || workspace.error));

  useRouteTransitionPageReady(isPageReady);

  useEffect(() => {
    if (workspace.isReady && !workspace.token) {
      window.location.replace("/profile/me");
    }
  }, [workspace.isReady, workspace.token]);

  if (!workspace.isReady || (workspace.token && !workspace.snapshot && workspace.isLoadingSnapshot)) {
    return <ProfileLoadingState title="Preparing My Goods" description="Loading your inventory workspace..." />;
  }

  if (!workspace.token || !workspace.snapshot) {
    return <ProfileLoadingState title="Loading My Goods" description={workspace.error ?? "Checking your inventory access..."} />;
  }

  const { snapshot } = workspace;

  return (
    <main className="container-shell pb-16 pt-28">
      <WorkspacePageHeader
        eyebrow="My Goods"
        title="My Goods"
        description="Track household stock by place, let the system project recurring use, and surface the items that need attention first."
        actions={goodsHeaderActionGroups}
      />

      {workspace.error ? <p className="status-error mb-4 text-sm">{workspace.error}</p> : null}
      {workspace.statusMessage ? <p className="status-success mb-4 text-sm">{workspace.statusMessage}</p> : null}

      <section className="mb-6">
        <Card className="panel-soft overflow-hidden">
          <CardHeader>
            <CardTitle>AI Dinner Advisor</CardTitle>
            <p className="body-muted text-sm">
              Ask for dinner ideas based on your tracked goods. The advisor keeps the reply compact: two pantry meals and one minimal-buy option.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {advisorStarterPrompts.map((prompt) => (
                <Button
                  key={prompt}
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={workspace.isAdvisorSubmitting}
                  onClick={() => void workspace.onAskDinnerAdvisor(prompt)}
                >
                  {prompt}
                </Button>
              ))}
            </div>

            <div className="grid gap-3 md:grid-cols-[180px_minmax(0,1fr)_auto]">
              <SelectField value={workspace.advisorScope} onChange={(event) => workspace.setAdvisorScope(event.target.value as typeof workspace.advisorScope)}>
                <option value="AUTO">All available goods</option>
                <option value="PERSONAL">Personal only</option>
                {snapshot.workspace.hasPartnerConnection ? <option value="SHARED">Shared only</option> : null}
              </SelectField>
              <TextField
                value={workspace.advisorDraft}
                onChange={(event) => workspace.setAdvisorDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void workspace.onAskDinnerAdvisor();
                  }
                }}
                placeholder="Ask for dinner ideas, for example quick dinner for 2"
              />
              <Button type="button" disabled={workspace.isAdvisorSubmitting} onClick={() => void workspace.onAskDinnerAdvisor()}>
                {workspace.isAdvisorSubmitting ? "Thinking..." : "Ask advisor"}
              </Button>
            </div>

            {workspace.advisorError ? <p className="status-error text-sm">{workspace.advisorError}</p> : null}

            <div className="space-y-4">
              {workspace.advisorChat.length ? (
                workspace.advisorChat.map((entry) => (
                  <div key={entry.id} className="space-y-3">
                    <div className="ml-auto max-w-[90%] rounded-[28px] bg-[var(--ink)] px-4 py-3 text-sm text-[var(--paper)]">
                      {entry.prompt}
                    </div>

                    {entry.response ? (
                      <div className="rounded-[28px] border border-[rgba(201,168,76,0.2)] bg-[rgba(255,250,241,0.78)] p-4">
                        <p className="text-sm leading-6">{entry.response.assistantMessage}</p>
                        {entry.response.warnings.length ? (
                          <div className="mt-3 space-y-1">
                            {entry.response.warnings.map((warning, index) => (
                              <p key={`${entry.id}-warning-${index}`} className="body-muted text-xs">
                                {warning}
                              </p>
                            ))}
                          </div>
                        ) : null}

                        <div className="mt-4 grid gap-4 xl:grid-cols-3">
                          <RecipeSuggestionCard heading="Pantry meal 1" recipe={entry.response.pantryMeals[0]} />
                          <RecipeSuggestionCard heading="Pantry meal 2" recipe={entry.response.pantryMeals[1]} />
                          <RecipeSuggestionCard heading="Minimal buy" recipe={entry.response.minimalBuyMeal} showMissingItems />
                        </div>
                      </div>
                    ) : (
                      <div className="max-w-[95%] rounded-[28px] border border-[rgba(201,168,76,0.2)] px-4 py-3 text-sm">
                        Building dinner ideas from your current goods...
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="rounded-[28px] border border-dashed border-[rgba(201,168,76,0.24)] px-4 py-5 text-sm">
                  Ask a dinner question and the advisor will return two pantry meals plus one minimal-buy option with a direct recipe button.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mb-6 grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <Card className="panel-soft">
          <CardHeader><CardTitle>Add item</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="grid gap-3 md:grid-cols-3">
                <SelectField value={workspace.createItemForm.scope} onChange={(event) => workspace.onCreateItemScopeChange(event.target.value as "PERSONAL" | "SHARED")}>
                  <option value="PERSONAL">Personal</option>
                  {snapshot.workspace.hasPartnerConnection ? <option value="SHARED">Shared</option> : null}
                </SelectField>
                <SelectField value={workspace.createItemForm.placeId} onChange={(event) => workspace.setCreateItemForm((current) => ({ ...current, placeId: event.target.value }))} placeholder="Choose place">
                  <option value="">Choose place</option>
                  {workspace.visiblePlaceOptions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </SelectField>
                <SelectField value={workspace.createItemForm.categoryId} onChange={(event) => workspace.setCreateItemForm((current) => ({ ...current, categoryId: event.target.value }))} placeholder="Choose category">
                  <option value="">Choose category</option>
                  {workspace.visibleCategoryOptions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </SelectField>
              </div>

              <TextField value={workspace.createItemForm.name} onChange={(event) => workspace.setCreateItemForm((current) => ({ ...current, name: event.target.value }))} placeholder="Good name" />

              <div className="grid gap-3 md:grid-cols-2">
                <TextField value={workspace.createItemForm.quantity} onChange={(event) => workspace.setCreateItemForm((current) => ({ ...current, quantity: event.target.value }))} placeholder="Quantity" />
                <SelectField value={workspace.createItemForm.uomId} onChange={(event) => workspace.setCreateItemForm((current) => ({ ...current, uomId: event.target.value }))} placeholder="Unit">
                  {snapshot.catalog.uoms.map((item) => <option key={item.id} value={item.id}>{item.code}</option>)}
                </SelectField>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <TextField value={workspace.createItemForm.lowStockThreshold} onChange={(event) => workspace.setCreateItemForm((current) => ({ ...current, lowStockThreshold: event.target.value }))} placeholder="Low stock threshold" />
                <TextField value={workspace.createItemForm.targetQuantity} onChange={(event) => workspace.setCreateItemForm((current) => ({ ...current, targetQuantity: event.target.value }))} placeholder="Target quantity" />
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <DatePicker value={workspace.createItemForm.expirationDate} onChange={(value) => workspace.setCreateItemForm((current) => ({ ...current, expirationDate: value }))} placeholder="Expiration date" />
                <TextField value={workspace.createItemForm.consumptionRateValue} onChange={(event) => workspace.setCreateItemForm((current) => ({ ...current, consumptionRateValue: event.target.value }))} placeholder="Usage rate" />
                <SelectField value={workspace.createItemForm.consumptionRateUnit} onChange={(event) => workspace.setCreateItemForm((current) => ({ ...current, consumptionRateUnit: event.target.value as typeof current.consumptionRateUnit }))} placeholder="Rate unit">
                  <option value="PERMANENT">Permanent</option>
                  <option value="HOUR">Per hour</option>
                  <option value="DAY">Per day</option>
                  <option value="WEEK">Per week</option>
                </SelectField>
              </div>
            </div>
            <TextareaField value={workspace.createItemForm.note} onChange={(event) => workspace.setCreateItemForm((current) => ({ ...current, note: event.target.value }))} placeholder="Optional note" rows={3} />
            <Button type="button" disabled={workspace.isSubmitting || !workspace.canCreateItem} onClick={() => void workspace.onCreateItem()}>
              Add goods item
            </Button>
          </CardContent>
        </Card>

        <Card className="panel-soft">
          <CardHeader><CardTitle>Needs attention now</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {snapshot.highlights.attentionItems.length ? snapshot.highlights.attentionItems.map((item) => (
              <div key={item.id} className="rounded-2xl border border-[rgba(201,168,76,0.16)] px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="body-muted text-xs">{item.place?.name} • {item.category?.name}</p>
                  </div>
                  <div className="text-right text-sm">
                    <p>{item.effectiveQuantity} {item.uom?.code}</p>
                    <p className="body-muted text-xs">{item.stockStatus.replaceAll("_", " ")} / {item.expirationStatus.replaceAll("_", " ")}</p>
                  </div>
                </div>
              </div>
            )) : <p className="body-muted text-sm">No urgent goods right now.</p>}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <Card className="panel-soft xl:col-span-1">
          <CardHeader><CardTitle>Run out soon</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {snapshot.highlights.runOutSoon.length ? snapshot.highlights.runOutSoon.map((item) => (
              <div key={item.id} className="rounded-2xl border border-[rgba(201,168,76,0.16)] px-4 py-3 text-sm">
                <p className="font-medium">{item.name}</p>
                <p className="body-muted text-xs">{item.estimatedRunOutAt ? new Date(item.estimatedRunOutAt).toLocaleString("en-GB") : "Not estimated"}</p>
              </div>
            )) : <p className="body-muted text-sm">No projected run-outs yet.</p>}
          </CardContent>
        </Card>

        <Card className="panel-soft xl:col-span-1">
          <CardHeader><CardTitle>By place</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {snapshot.breakdown.byPlace.map((item) => (
              <div key={item.id} className="rounded-2xl border border-[rgba(201,168,76,0.16)] px-4 py-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span>{item.name}</span>
                  <span>{item.itemCount}</span>
                </div>
                <p className="body-muted mt-1 text-xs">Low {item.lowCount} • Out {item.outCount} • Expiring {item.expiringCount}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="panel-soft xl:col-span-1">
          <CardHeader><CardTitle>Recent changes</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {snapshot.highlights.recentChanges.length ? snapshot.highlights.recentChanges.map((item) => (
              <div key={item.id} className="rounded-2xl border border-[rgba(201,168,76,0.16)] px-4 py-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span>{item.item.name}</span>
                  <span>{item.eventType}</span>
                </div>
                <p className="body-muted mt-1 text-xs">{new Date(item.occurredAt).toLocaleString("en-GB")}</p>
              </div>
            )) : <p className="body-muted text-sm">No stock history yet.</p>}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
