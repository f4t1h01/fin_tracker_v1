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

      <section className="mb-6 grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <Card className="panel-soft">
          <CardHeader><CardTitle>Add item</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                <label className="space-y-1 text-sm">
                  <span className="field-label">Scope</span>
                  <SelectField value={workspace.createItemForm.scope} onChange={(event) => workspace.setCreateItemForm((current) => ({ ...current, scope: event.target.value as "PERSONAL" | "SHARED", categoryId: "" }))}>
                    <option value="PERSONAL">Personal</option>
                    {snapshot.workspace.hasPartnerConnection ? <option value="SHARED">Shared</option> : null}
                  </SelectField>
                </label>
                <label className="space-y-1 text-sm">
                  <span className="field-label">Place</span>
                  <SelectField value={workspace.createItemForm.placeId} onChange={(event) => workspace.setCreateItemForm((current) => ({ ...current, placeId: event.target.value }))}>
                    {snapshot.catalog.places.filter((item) => item.scope === workspace.createItemForm.scope).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </SelectField>
                </label>
                <label className="space-y-1 text-sm">
                  <span className="field-label">Category</span>
                  <SelectField value={workspace.createItemForm.categoryId} onChange={(event) => workspace.setCreateItemForm((current) => ({ ...current, categoryId: event.target.value }))}>
                    {workspace.filteredCategoryOptions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </SelectField>
                </label>
              </div>

              <label className="block space-y-1 text-sm">
                <span className="field-label">Name</span>
                <TextField value={workspace.createItemForm.name} onChange={(event) => workspace.setCreateItemForm((current) => ({ ...current, name: event.target.value }))} placeholder="Milk" />
              </label>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-1 text-sm">
                  <span className="field-label">Quantity</span>
                  <TextField value={workspace.createItemForm.quantity} onChange={(event) => workspace.setCreateItemForm((current) => ({ ...current, quantity: event.target.value }))} placeholder="2" />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="field-label">Unit</span>
                  <SelectField value={workspace.createItemForm.uomId} onChange={(event) => workspace.setCreateItemForm((current) => ({ ...current, uomId: event.target.value }))}>
                    {snapshot.catalog.uoms.map((item) => <option key={item.id} value={item.id}>{item.code}</option>)}
                  </SelectField>
                </label>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-1 text-sm">
                  <span className="field-label">Low stock threshold</span>
                  <TextField value={workspace.createItemForm.lowStockThreshold} onChange={(event) => workspace.setCreateItemForm((current) => ({ ...current, lowStockThreshold: event.target.value }))} placeholder="1" />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="field-label">Target quantity</span>
                  <TextField value={workspace.createItemForm.targetQuantity} onChange={(event) => workspace.setCreateItemForm((current) => ({ ...current, targetQuantity: event.target.value }))} placeholder="4" />
                </label>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <label className="space-y-1 text-sm">
                  <span className="field-label">Expiration date</span>
                  <DatePicker value={workspace.createItemForm.expirationDate} onChange={(value) => workspace.setCreateItemForm((current) => ({ ...current, expirationDate: value }))} />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="field-label">Usage rate</span>
                  <TextField value={workspace.createItemForm.consumptionRateValue} onChange={(event) => workspace.setCreateItemForm((current) => ({ ...current, consumptionRateValue: event.target.value }))} placeholder="0.5" />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="field-label">Rate unit</span>
                  <SelectField value={workspace.createItemForm.consumptionRateUnit} onChange={(event) => workspace.setCreateItemForm((current) => ({ ...current, consumptionRateUnit: event.target.value as typeof current.consumptionRateUnit }))}>
                    <option value="PERMANENT">Permanent</option>
                    <option value="HOUR">Per hour</option>
                    <option value="DAY">Per day</option>
                    <option value="WEEK">Per week</option>
                  </SelectField>
                </label>
              </div>
            </div>
            <label className="block space-y-1 text-sm">
              <span className="field-label">Note</span>
              <TextareaField value={workspace.createItemForm.note} onChange={(event) => workspace.setCreateItemForm((current) => ({ ...current, note: event.target.value }))} placeholder="Optional note" rows={3} />
            </label>
            <Button type="button" disabled={workspace.isSubmitting} onClick={() => void workspace.onCreateItem()}>
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
