import { Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import { TogglePill } from "@/components/ui/toggle-pill";

import { buildCategoryOptions } from "@/components/profile/category-options";
import { type CategoryCatalogResponse, type CategoryScope } from "@/components/profile/types";

type CategoryManagementCardProps = {
  categoryCatalog: CategoryCatalogResponse | null;
  hasActivePartnerConnection: boolean;
  showSharedCategoriesInPicker: boolean;
  setShowSharedCategoriesInPicker: (value: boolean) => void;
  defaultIncomeCategoryId: string;
  setDefaultIncomeCategoryId: (value: string) => void;
  defaultExpenseCategoryId: string;
  setDefaultExpenseCategoryId: (value: string) => void;
  isSavingCategoryPreferences: boolean;
  categoryPreferencesMessage: string | null;
  categoryPreferencesError: string | null;
  onSaveCategoryPreferences: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  categoryFormKind: "EXPENSE" | "INCOME";
  setCategoryFormKind: (value: "EXPENSE" | "INCOME") => void;
  categoryFormScope: CategoryScope;
  setCategoryFormScope: (value: CategoryScope) => void;
  categoryFormName: string;
  setCategoryFormName: (value: string) => void;
  categoryFormParentId: string;
  setCategoryFormParentId: (value: string) => void;
  isSavingCategory: boolean;
  isDeletingCategoryId: string | null;
  isUpdatingCategoryVisibilityId: string | null;
  categoryMessage: string | null;
  categoryError: string | null;
  onCreateCategory: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  onDeleteCategory: (categoryId: string) => Promise<void>;
  onToggleCategoryVisibility: (categoryId: string, isVisible: boolean) => Promise<void>;
};

function CategoryList(props: {
  title: string;
  groups: CategoryCatalogResponse["byKind"];
  scope: CategoryScope;
  isDeletingCategoryId: string | null;
  isUpdatingCategoryVisibilityId: string | null;
  onDeleteCategory: (categoryId: string) => Promise<void>;
  onToggleCategoryVisibility: (categoryId: string, isVisible: boolean) => Promise<void>;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">{props.title}</p>
      {(["EXPENSE", "INCOME"] as const).map((kind) => {
        const items = props.scope === "PERSONAL" ? props.groups[kind].personal : props.groups[kind].shared;
        return (
          <div key={kind} className="detail-box space-y-2 px-3 py-3">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{kind}</p>
            {items.length === 0 ? (
              <p className="body-muted text-sm">No categories yet.</p>
            ) : (
              <div className="space-y-2">
                {items.map((item) => (
                  <div key={item.id} className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <span className={item.isVisible ? "text-sm font-medium" : "text-sm font-medium text-[var(--ink-soft)]"}>{item.name}</span>
                      <div className="flex items-center gap-2">
                        <Button type="button" variant="outline" disabled={props.isUpdatingCategoryVisibilityId === item.id} onClick={() => void props.onToggleCategoryVisibility(item.id, !item.isVisible)}>
                          {item.isVisible ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                        </Button>
                        <Button type="button" variant="outline" disabled={props.isDeletingCategoryId === item.id} pending={props.isDeletingCategoryId === item.id} pendingText="Removing..." onClick={() => void props.onDeleteCategory(item.id)}>
                          Delete
                        </Button>
                      </div>
                    </div>
                    {item.children.length > 0 ? (
                      <div className="space-y-1 pl-3">
                        {item.children.map((child) => (
                          <div key={child.id} className="flex items-center justify-between gap-3 text-sm">
                            <span className={child.isVisible ? "body-muted" : "body-muted opacity-60"}>{item.name} / {child.name}</span>
                            <div className="flex items-center gap-2">
                              <Button type="button" variant="outline" disabled={props.isUpdatingCategoryVisibilityId === child.id} onClick={() => void props.onToggleCategoryVisibility(child.id, !child.isVisible)}>
                                {child.isVisible ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                              </Button>
                              <Button type="button" variant="outline" disabled={props.isDeletingCategoryId === child.id} pending={props.isDeletingCategoryId === child.id} pendingText="Removing..." onClick={() => void props.onDeleteCategory(child.id)}>
                                Delete
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function CategoryManagementCard(props: CategoryManagementCardProps) {
  const incomeOptions = buildCategoryOptions(props.categoryCatalog, "INCOME", { forceIncludeShared: true });
  const expenseOptions = buildCategoryOptions(props.categoryCatalog, "EXPENSE", { forceIncludeShared: true });
  const parentOptions = props.categoryFormScope === "PERSONAL"
    ? (props.categoryFormKind === "INCOME" ? incomeOptions.personal : expenseOptions.personal).filter((item) => item.parentCategoryId === null)
    : (props.categoryFormKind === "INCOME" ? incomeOptions.shared : expenseOptions.shared).filter((item) => item.parentCategoryId === null);

  return (
    <Card className="panel-soft">
      <CardHeader>
        <CardTitle>Category management</CardTitle>
        <CardDescription>Create personal or shared categories, control picker visibility, and choose your defaults.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form className="space-y-4" onSubmit={props.onSaveCategoryPreferences}>
          <div className="detail-box space-y-3 px-3 py-3 text-sm">
            <TogglePill
              checked={props.showSharedCategoriesInPicker}
              label="Show shared couple categories in my transaction picker"
              onToggle={props.setShowSharedCategoriesInPicker}
            />
            {!props.hasActivePartnerConnection ? <p className="body-muted text-sm">Shared categories become available after connecting a partner.</p> : null}
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span className="field-label">Default income category</span>
                <SelectField value={props.defaultIncomeCategoryId} onChange={(event) => props.setDefaultIncomeCategoryId(event.target.value)}>
                  <option value="">None</option>
                  <optgroup label="My categories">{incomeOptions.personal.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</optgroup>
                  {incomeOptions.shared.length > 0 ? <optgroup label="Shared categories">{incomeOptions.shared.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</optgroup> : null}
                </SelectField>
              </label>
              <label className="space-y-1 text-sm">
                <span className="field-label">Default expense category</span>
                <SelectField value={props.defaultExpenseCategoryId} onChange={(event) => props.setDefaultExpenseCategoryId(event.target.value)}>
                  <option value="">None</option>
                  <optgroup label="My categories">{expenseOptions.personal.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</optgroup>
                  {expenseOptions.shared.length > 0 ? <optgroup label="Shared categories">{expenseOptions.shared.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</optgroup> : null}
                </SelectField>
              </label>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={props.isSavingCategoryPreferences} pending={props.isSavingCategoryPreferences} pendingText="Saving...">Save category preferences</Button>
            {props.categoryPreferencesMessage ? <p className="status-success text-sm">{props.categoryPreferencesMessage}</p> : null}
            {props.categoryPreferencesError ? <p className="status-error text-sm">{props.categoryPreferencesError}</p> : null}
          </div>
        </form>

        <form className="space-y-3" onSubmit={props.onCreateCategory}>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="space-y-1 text-sm">
              <span className="field-label">Type</span>
              <SelectField value={props.categoryFormKind} onChange={(event) => props.setCategoryFormKind(event.target.value as "EXPENSE" | "INCOME")}>
                <option value="EXPENSE">Expense</option>
                <option value="INCOME">Income</option>
              </SelectField>
            </label>
            <label className="space-y-1 text-sm">
              <span className="field-label">Scope</span>
              <SelectField value={props.categoryFormScope} onChange={(event) => props.setCategoryFormScope(event.target.value as CategoryScope)}>
                <option value="PERSONAL">My category</option>
                {props.hasActivePartnerConnection ? <option value="SHARED">Shared category</option> : null}
              </SelectField>
            </label>
            <label className="space-y-1 text-sm">
              <span className="field-label">Parent (optional)</span>
              <SelectField value={props.categoryFormParentId} onChange={(event) => props.setCategoryFormParentId(event.target.value)}>
                <option value="">Top-level category</option>
                {parentOptions.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </SelectField>
            </label>
            <label className="space-y-1 text-sm">
              <span className="field-label">Name</span>
              <TextField required value={props.categoryFormName} onChange={(event) => props.setCategoryFormName(event.target.value)} placeholder="Groceries" />
            </label>
          </div>
          <p className="body-muted text-sm">Choose a parent only when creating a subcategory. Shared categories are available only while a partner is connected.</p>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={props.isSavingCategory} pending={props.isSavingCategory} pendingText="Saving...">Add category</Button>
            {props.categoryMessage ? <p className="status-success text-sm">{props.categoryMessage}</p> : null}
            {props.categoryError ? <p className="status-error text-sm">{props.categoryError}</p> : null}
          </div>
        </form>

        {props.categoryCatalog ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <CategoryList title="My categories" groups={props.categoryCatalog.byKind} scope="PERSONAL" isDeletingCategoryId={props.isDeletingCategoryId} isUpdatingCategoryVisibilityId={props.isUpdatingCategoryVisibilityId} onDeleteCategory={props.onDeleteCategory} onToggleCategoryVisibility={props.onToggleCategoryVisibility} />
            {props.hasActivePartnerConnection ? (
              <CategoryList title="Shared categories" groups={props.categoryCatalog.byKind} scope="SHARED" isDeletingCategoryId={props.isDeletingCategoryId} isUpdatingCategoryVisibilityId={props.isUpdatingCategoryVisibilityId} onDeleteCategory={props.onDeleteCategory} onToggleCategoryVisibility={props.onToggleCategoryVisibility} />
            ) : (
              <div className="space-y-3">
                <p className="text-sm font-medium">Shared categories</p>
                <div className="detail-box px-3 py-3">
                  <p className="body-muted text-sm">Connect a partner to create and use shared categories in this workspace.</p>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
