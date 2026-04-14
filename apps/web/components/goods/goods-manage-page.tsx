"use client";

import { useEffect } from "react";
import { Eye, EyeOff } from "lucide-react";

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

  const places = workspace.placesData?.items ?? [];
  const categories = workspace.categoriesData?.items ?? [];

  return (
    <main className="container-shell pb-16 pt-28">
      <WorkspacePageHeader eyebrow="My Goods" title="Setup" actions={goodsHeaderActionGroups} />

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
              {places.map((item) => (
                <div key={item.id} className="rounded-2xl border border-[rgba(201,168,76,0.16)] px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className={item.isVisible ? "font-medium" : "font-medium text-[var(--ink-soft)]"}>{item.name}</p>
                      <p className="body-muted text-xs">{item.scope} • {item.itemCount} active item{item.itemCount === 1 ? "" : "s"}{item.isVisible ? "" : " • Hidden"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="outline" disabled={workspace.isSubmitting} onClick={() => void workspace.onTogglePlaceVisibility(item.id, !item.isVisible)}>
                        {item.isVisible ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                        {item.isVisible ? "Hide" : "Show"}
                      </Button>
                      <Button type="button" variant="outline" disabled={workspace.isSubmitting || item.itemCount > 0} onClick={() => void workspace.onDeletePlace(item.id)}>
                        Delete
                      </Button>
                    </div>
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
              {categories.map((item) => (
                <div key={item.id} className="rounded-2xl border border-[rgba(201,168,76,0.16)] px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className={item.isVisible ? "font-medium" : "font-medium text-[var(--ink-soft)]"}>{item.name}</p>
                      <p className="body-muted text-xs">{item.scope}{item.isSeeded ? " • Default" : ""} • {item.itemCount} active item{item.itemCount === 1 ? "" : "s"}{item.isVisible ? "" : " • Hidden"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="outline" disabled={workspace.isSubmitting} onClick={() => void workspace.onToggleCategoryVisibility(item.id, !item.isVisible)}>
                        {item.isVisible ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                        {item.isVisible ? "Hide" : "Show"}
                      </Button>
                      <Button type="button" variant="outline" disabled={workspace.isSubmitting || item.itemCount > 0} onClick={() => void workspace.onDeleteCategory(item.id)}>
                        Delete
                      </Button>
                    </div>
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
