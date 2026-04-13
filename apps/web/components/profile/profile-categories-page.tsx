"use client";

import { useEffect } from "react";

import { WorkspacePageHeader } from "@/components/navigation/workspace-page-header";
import { useRouteTransitionPageReady } from "@/components/navigation/route-transition-provider";
import { Card, CardContent } from "@/components/ui/card";

import { CategoryManagementCard } from "./management/category-management-card";
import { ProfileLoadingState } from "./profile-loading-state";
import { useProfileWorkspace } from "./use-profile-workspace";

export function ProfileCategoriesPage() {
  const workspace = useProfileWorkspace({ routePath: "/profile/me/categories" });
  const isPageReady = !workspace.isAuthenticating && (!workspace.token || Boolean(workspace.authError || (workspace.profile && workspace.authMe)));

  useRouteTransitionPageReady(isPageReady);

  useEffect(() => {
    if (!workspace.isAuthenticating && !workspace.token) {
      window.location.replace("/profile/me");
    }
  }, [workspace.isAuthenticating, workspace.token]);

  if (workspace.isAuthenticating) {
    return <ProfileLoadingState title="Preparing categories" description="Checking your session..." />;
  }

  if (!workspace.token) {
    return null;
  }

  if (!workspace.profile || !workspace.authMe) {
    return <ProfileLoadingState title="Loading categories" description={workspace.authError ?? "Fetching category settings and catalog..."} />;
  }

  return (
    <main className="container-shell pb-16 pt-28">
      <WorkspacePageHeader eyebrow="Categories" title="Category management" />

      {workspace.authError ? (
        <Card className="mb-6 border-red-300/20 bg-red-500/10 dark:border-red-400/30 dark:bg-red-500/10">
          <CardContent className="pt-6">
            <p className="status-error text-sm">{workspace.authError}</p>
          </CardContent>
        </Card>
      ) : null}

      <CategoryManagementCard
        categoryCatalog={workspace.categoryCatalog}
        hasActivePartnerConnection={Boolean(workspace.profile.hasPartnerConnection)}
        showSharedCategoriesInPicker={workspace.showSharedCategoriesInPicker}
        setShowSharedCategoriesInPicker={workspace.setShowSharedCategoriesInPicker}
        defaultIncomeCategoryId={workspace.defaultIncomeCategoryId}
        setDefaultIncomeCategoryId={workspace.setDefaultIncomeCategoryId}
        defaultExpenseCategoryId={workspace.defaultExpenseCategoryId}
        setDefaultExpenseCategoryId={workspace.setDefaultExpenseCategoryId}
        isSavingCategoryPreferences={workspace.isSavingCategoryPreferences}
        categoryPreferencesMessage={workspace.categoryPreferencesMessage}
        categoryPreferencesError={workspace.categoryPreferencesError}
        onSaveCategoryPreferences={workspace.onSaveCategoryPreferences}
        categoryFormKind={workspace.categoryFormKind}
        setCategoryFormKind={workspace.setCategoryFormKind}
        categoryFormScope={workspace.categoryFormScope}
        setCategoryFormScope={workspace.setCategoryFormScope}
        categoryFormName={workspace.categoryFormName}
        setCategoryFormName={workspace.setCategoryFormName}
        categoryFormParentId={workspace.categoryFormParentId}
        setCategoryFormParentId={workspace.setCategoryFormParentId}
        isSavingCategory={workspace.isSavingCategory}
        isDeletingCategoryId={workspace.isDeletingCategoryId}
        isUpdatingCategoryVisibilityId={workspace.isUpdatingCategoryVisibilityId}
        categoryMessage={workspace.categoryMessage}
        categoryError={workspace.categoryError}
        onCreateCategory={workspace.onCreateCategory}
        onDeleteCategory={workspace.onDeleteCategory}
        onToggleCategoryVisibility={workspace.onToggleCategoryVisibility}
      />
    </main>
  );
}
