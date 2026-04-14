"use client";

import { useEffect } from "react";

import { WorkspacePageHeader } from "@/components/navigation/workspace-page-header";
import { goodsHeaderActionGroups } from "@/components/navigation/workspace-navigation";
import { useRouteTransitionPageReady } from "@/components/navigation/route-transition-provider";
import { ProfileLoadingState } from "@/components/profile/profile-loading-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";

import { GoodsItemCard } from "./goods-item-card";
import { useGoodsWorkspace } from "./use-goods-workspace";

export function GoodsInventoryPage() {
  const workspace = useGoodsWorkspace({ loadList: true });
  const isPageReady = workspace.isReady && (!workspace.token || Boolean(workspace.snapshot || workspace.error));

  useRouteTransitionPageReady(isPageReady);

  useEffect(() => {
    if (workspace.isReady && !workspace.token) {
      window.location.replace("/profile/me");
    }
  }, [workspace.isReady, workspace.token]);

  if (!workspace.isReady || (workspace.token && !workspace.snapshot && workspace.isLoadingSnapshot)) {
    return <ProfileLoadingState title="Preparing inventory" description="Loading goods list and filters..." />;
  }

  if (!workspace.token || !workspace.snapshot) {
    return <ProfileLoadingState title="Loading inventory" description={workspace.error ?? "Checking your goods access..."} />;
  }

  const snapshot = workspace.snapshot;
  const metricCards = [
    { label: "Active items", value: snapshot.metrics.activeItems },
    { label: "Low stock", value: snapshot.metrics.lowStockItems },
    { label: "Out", value: snapshot.metrics.outOfStockItems },
    { label: "Expiring soon", value: snapshot.metrics.expiringSoonItems },
    { label: "Expired", value: snapshot.metrics.expiredItems },
    { label: "Updated 7d", value: snapshot.metrics.recentlyUpdatedItems },
  ];

  return (
    <main className="container-shell pb-16 pt-28">
      <WorkspacePageHeader eyebrow="My Goods" title="Stock" actions={goodsHeaderActionGroups} />

      {workspace.error ? <p className="status-error mb-4 text-sm">{workspace.error}</p> : null}
      {workspace.statusMessage ? <p className="status-success mb-4 text-sm">{workspace.statusMessage}</p> : null}

      <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
        {metricCards.map((item) => (
          <Card key={item.label} className="panel-soft">
            <CardHeader className="space-y-1 p-4 pb-2">
              <CardTitle className="text-[15px] leading-tight sm:text-base">{item.label}</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              <p className="text-xl font-semibold leading-none sm:text-2xl">{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card className="panel-soft mb-6">
        <CardHeader><CardTitle>Filters</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <TextField value={workspace.listFilters.search} onChange={(event) => workspace.setListFilters((current) => ({ ...current, search: event.target.value, page: 1 }))} placeholder="Search goods, place, category" />
          <SelectField value={workspace.listFilters.placeId} onChange={(event) => workspace.setListFilters((current) => ({ ...current, placeId: event.target.value, page: 1 }))}>
            <option value="">All places</option>
            {snapshot.catalog.places.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </SelectField>
          <SelectField value={workspace.listFilters.categoryId} onChange={(event) => workspace.setListFilters((current) => ({ ...current, categoryId: event.target.value, page: 1 }))}>
            <option value="">All categories</option>
            {snapshot.catalog.categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </SelectField>
          <SelectField value={workspace.listFilters.scope} onChange={(event) => workspace.setListFilters((current) => ({ ...current, scope: event.target.value as typeof current.scope, page: 1 }))}>
            <option value="">All scopes</option>
            <option value="PERSONAL">Personal</option>
            {snapshot.workspace.hasPartnerConnection ? <option value="SHARED">Shared</option> : null}
          </SelectField>
          <SelectField value={workspace.listFilters.stockStatus} onChange={(event) => workspace.setListFilters((current) => ({ ...current, stockStatus: event.target.value as typeof current.stockStatus, page: 1 }))}>
            <option value="">All stock states</option>
            <option value="FULL">Full</option>
            <option value="ENOUGH">Enough</option>
            <option value="LOW">Low</option>
            <option value="OUT_OF_STOCK">Out of stock</option>
          </SelectField>
          <SelectField value={workspace.listFilters.expirationStatus} onChange={(event) => workspace.setListFilters((current) => ({ ...current, expirationStatus: event.target.value as typeof current.expirationStatus, page: 1 }))}>
            <option value="">All freshness states</option>
            <option value="FRESH">Fresh</option>
            <option value="EXPIRING_SOON">Expiring soon</option>
            <option value="EXPIRED">Expired</option>
            <option value="NO_EXPIRATION">No expiration</option>
          </SelectField>
          <SelectField value={workspace.listFilters.sort} onChange={(event) => workspace.setListFilters((current) => ({ ...current, sort: event.target.value, page: 1 }))}>
            <option value="RECENTLY_UPDATED">Recently updated</option>
            <option value="EXPIRATION_ASC">Expiration date</option>
            <option value="RUN_OUT_ASC">Run out soon</option>
            <option value="LOW_QUANTITY">Lowest stock gap</option>
            <option value="NAME">Name</option>
            <option value="PLACE">Place</option>
            <option value="CATEGORY">Category</option>
          </SelectField>
          <label className="detail-box flex items-center gap-3 px-3 py-3 text-sm">
            <input type="checkbox" checked={workspace.listFilters.lowOnly} onChange={(event) => workspace.setListFilters((current) => ({ ...current, lowOnly: event.target.checked, page: 1 }))} />
            Low only
          </label>
          <label className="detail-box flex items-center gap-3 px-3 py-3 text-sm">
            <input type="checkbox" checked={workspace.listFilters.recentlyUpdatedOnly} onChange={(event) => workspace.setListFilters((current) => ({ ...current, recentlyUpdatedOnly: event.target.checked, page: 1 }))} />
            Updated in 7 days
          </label>
          <label className="detail-box flex items-center gap-3 px-3 py-3 text-sm">
            <input type="checkbox" checked={workspace.listFilters.autoConsumptionOnly} onChange={(event) => workspace.setListFilters((current) => ({ ...current, autoConsumptionOnly: event.target.checked, page: 1 }))} />
            Auto-consumption only
          </label>
        </CardContent>
      </Card>

      <div className="mb-4 flex items-center justify-between gap-3 text-sm">
        <p className="body-muted">{workspace.listData?.totalItems ?? 0} items</p>
        <div className="flex gap-2">
          <button className="secondary-link" disabled={!workspace.listData || workspace.listData.page <= 1} onClick={() => workspace.setListFilters((current) => ({ ...current, page: Math.max(1, current.page - 1) }))}>Prev</button>
          <span className="body-muted">Page {workspace.listData?.page ?? 1} / {workspace.listData?.totalPages ?? 1}</span>
          <button className="secondary-link" disabled={!workspace.listData || workspace.listData.page >= workspace.listData.totalPages} onClick={() => workspace.setListFilters((current) => ({ ...current, page: current.page + 1 }))}>Next</button>
        </div>
      </div>

      <section className="space-y-4">
        {workspace.listData?.items.length ? workspace.listData.items.map((item) => (
          <GoodsItemCard
            key={item.id}
            item={item}
            places={snapshot.catalog.places}
            categories={snapshot.catalog.categories}
            uoms={snapshot.catalog.uoms}
            history={workspace.historyByItemId[item.id]}
            isSubmitting={workspace.isSubmitting}
            onLoadHistory={workspace.loadHistory}
            onRestockItem={workspace.onRestockItem}
            onConsumeItem={workspace.onConsumeItem}
            onReconcileItem={workspace.onReconcileItem}
            onMoveItem={workspace.onMoveItem}
            onUpdateItem={workspace.onUpdateItem}
            onArchiveItem={workspace.onArchiveItem}
          />
        )) : (
          <Card className="panel-soft">
            <CardContent className="pt-6">
              <p className="body-muted text-sm">{workspace.isLoadingList ? "Loading goods..." : "No goods match the current filters."}</p>
            </CardContent>
          </Card>
        )}
      </section>
    </main>
  );
}
