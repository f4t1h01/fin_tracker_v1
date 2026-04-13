"use client";

import { useEffect } from "react";

import { WorkspacePageHeader } from "@/components/navigation/workspace-page-header";
import { goodsHeaderActionGroups } from "@/components/navigation/workspace-navigation";
import { useRouteTransitionPageReady } from "@/components/navigation/route-transition-provider";
import { ProfileLoadingState } from "@/components/profile/profile-loading-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";

import { useGoodsWorkspace } from "./use-goods-workspace";

export function GoodsManagePage() {
  const workspace = useGoodsWorkspace();
  const isPageReady = workspace.isReady && (!workspace.token || Boolean(workspace.snapshot || workspace.error));

  useRouteTransitionPageReady(isPageReady);

  useEffect(() => {
    if (workspace.isReady && !workspace.token) {
      window.location.replace("/profile/me");
    }
  }, [workspace.isReady, workspace.token]);

  if (!workspace.isReady || (workspace.token && !workspace.snapshot && workspace.isLoadingSnapshot)) {
    return <ProfileLoadingState title="Preparing management" description="Loading goods structure..." />;
  }

  if (!workspace.token || !workspace.snapshot) {
    return <ProfileLoadingState title="Loading management" description={workspace.error ?? "Checking your goods access..."} />;
  }

  return (
    <main className="container-shell pb-16 pt-28">
      <WorkspacePageHeader eyebrow="My Goods" title="Places and categories" actions={goodsHeaderActionGroups} />

      {workspace.error ? <p className="status-error mb-4 text-sm">{workspace.error}</p> : null}
      {workspace.statusMessage ? <p className="status-success mb-4 text-sm">{workspace.statusMessage}</p> : null}

      <section className="grid gap-6 xl:grid-cols-2">
        <Card className="panel-soft">
          <CardHeader><CardTitle>Places</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-[180px_minmax(0,1fr)_auto]">
              <SelectField value={workspace.placeScope} onChange={(event) => workspace.setPlaceScope(event.target.value as "PERSONAL" | "SHARED")}>
                <option value="PERSONAL">Personal</option>
                {workspace.snapshot.workspace.hasPartnerConnection ? <option value="SHARED">Shared</option> : null}
              </SelectField>
              <TextField value={workspace.placeName} onChange={(event) => workspace.setPlaceName(event.target.value)} placeholder="Kitchen" />
              <Button type="button" disabled={workspace.isSubmitting || !workspace.placeName} onClick={() => void workspace.onCreatePlace()}>
                Add place
              </Button>
            </div>
            <div className="space-y-3">
              {workspace.snapshot.catalog.places.map((item) => (
                <div key={item.id} className="rounded-2xl border border-[rgba(201,168,76,0.16)] px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium">{item.name}</span>
                    <span className="body-muted text-xs">{item.scope}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="panel-soft">
          <CardHeader><CardTitle>Categories</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-[180px_minmax(0,1fr)_auto]">
              <SelectField value={workspace.categoryScope} onChange={(event) => workspace.setCategoryScope(event.target.value as "PERSONAL" | "SHARED")}>
                <option value="PERSONAL">Personal</option>
                {workspace.snapshot.workspace.hasPartnerConnection ? <option value="SHARED">Shared</option> : null}
              </SelectField>
              <TextField value={workspace.categoryName} onChange={(event) => workspace.setCategoryName(event.target.value)} placeholder="Dairy" />
              <Button type="button" disabled={workspace.isSubmitting || !workspace.categoryName} onClick={() => void workspace.onCreateCategory()}>
                Add category
              </Button>
            </div>
            <div className="space-y-3">
              {workspace.snapshot.catalog.categories.map((item) => (
                <div key={item.id} className="rounded-2xl border border-[rgba(201,168,76,0.16)] px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium">{item.name}</span>
                    <span className="body-muted text-xs">{item.scope}{item.isSeeded ? " • Default" : ""}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mt-6">
        <Card className="panel-soft">
          <CardHeader><CardTitle>Units of measure</CardTitle></CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {workspace.snapshot.catalog.uoms.map((item) => (
              <div key={item.id} className="rounded-2xl border border-[rgba(201,168,76,0.16)] px-4 py-3 text-sm">
                <p className="font-medium">{item.code}</p>
                <p className="body-muted text-xs">{item.label} • {item.groupKey}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
