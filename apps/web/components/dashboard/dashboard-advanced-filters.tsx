"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SelectField } from "@/components/ui/select-field";

import { buildCategoryOptions } from "@/components/profile/category-options";
import { dashboardActors, dashboardKinds, type CategoryCatalogResponse, type DashboardActor, type DashboardKind, type DashboardViewMode } from "@/components/profile/types";

type DashboardAdvancedFiltersProps = {
  categoryCatalog: CategoryCatalogResponse | null;
  viewMode: DashboardViewMode;
  kind: DashboardKind;
  categoryId: string;
  actor: DashboardActor;
  hasActivePartnerConnection: boolean;
  showKind?: boolean;
  onKindChange: (value: DashboardKind) => void;
  onCategoryChange: (value: string) => void;
  onActorChange: (value: DashboardActor) => void;
};

export function DashboardAdvancedFilters(props: DashboardAdvancedFiltersProps) {
  const includeSharedLocked = !props.hasActivePartnerConnection;
  const expenseOptions = buildCategoryOptions(props.categoryCatalog, "EXPENSE", { forceIncludeShared: includeSharedLocked });
  const incomeOptions = buildCategoryOptions(props.categoryCatalog, "INCOME", { forceIncludeShared: includeSharedLocked });
  const description =
    props.showKind === false
      ? props.hasActivePartnerConnection
        ? "Narrow by category and actor without overcrowding the primary toolbar."
        : "No partner is linked, so shared fields stay visible but locked."
      : props.hasActivePartnerConnection
        ? "Narrow by transaction kind, category, and actor without overcrowding the primary toolbar."
        : "No partner is linked, so shared fields stay visible but locked.";

  const renderCategoryOptions = () => {
    if (!props.categoryCatalog) {
      return null;
    }

    const sharedDisabled = !props.hasActivePartnerConnection;

    if (props.kind === "INCOME") {
      return (
        <>
          {incomeOptions.personal.length > 0 ? (
            <optgroup label="Income / My categories">
              {incomeOptions.personal.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </optgroup>
          ) : null}
          {incomeOptions.shared.length > 0 ? (
            <optgroup label="Income / Shared categories">
              {incomeOptions.shared.map((item) => (
                <option key={item.id} value={item.id} disabled={sharedDisabled}>
                  {item.label}
                </option>
              ))}
            </optgroup>
          ) : null}
        </>
      );
    }

    if (props.kind === "EXPENSE") {
      return (
        <>
          {expenseOptions.personal.length > 0 ? (
            <optgroup label="Expense / My categories">
              {expenseOptions.personal.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </optgroup>
          ) : null}
          {expenseOptions.shared.length > 0 ? (
            <optgroup label="Expense / Shared categories">
              {expenseOptions.shared.map((item) => (
                <option key={item.id} value={item.id} disabled={sharedDisabled}>
                  {item.label}
                </option>
              ))}
            </optgroup>
          ) : null}
        </>
      );
    }

    return (
      <>
        {expenseOptions.personal.length > 0 ? (
          <optgroup label="Expense / My categories">
            {expenseOptions.personal.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </optgroup>
        ) : null}
        {expenseOptions.shared.length > 0 ? (
          <optgroup label="Expense / Shared categories">
            {expenseOptions.shared.map((item) => (
              <option key={item.id} value={item.id} disabled={sharedDisabled}>
                {item.label}
              </option>
            ))}
          </optgroup>
        ) : null}
        {incomeOptions.personal.length > 0 ? (
          <optgroup label="Income / My categories">
            {incomeOptions.personal.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </optgroup>
        ) : null}
        {incomeOptions.shared.length > 0 ? (
          <optgroup label="Income / Shared categories">
            {incomeOptions.shared.map((item) => (
              <option key={item.id} value={item.id} disabled={sharedDisabled}>
                {item.label}
              </option>
            ))}
          </optgroup>
        ) : null}
      </>
    );
  };

  return (
    <Card className="panel-soft mb-6">
      <CardHeader>
        <CardTitle>Filters</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {props.showKind === false ? null : (
            <label className="space-y-1 text-sm">
              <span className="field-label">Kind</span>
              <SelectField value={props.kind} onChange={(event) => props.onKindChange(event.target.value as DashboardKind)}>
                {dashboardKinds.map((item) => (
                  <option key={item} value={item}>
                    {item === "ALL" ? "All" : item === "INCOME" ? "Income" : "Expense"}
                  </option>
                ))}
              </SelectField>
            </label>
          )}
          <label className="space-y-1 text-sm">
            <span className="field-label">Category</span>
            <SelectField value={props.categoryId} onChange={(event) => props.onCategoryChange(event.target.value)}>
              <option value="">All categories</option>
              {renderCategoryOptions()}
            </SelectField>
          </label>
          <label className="space-y-1 text-sm">
            <span className="field-label">Actor</span>
            <SelectField value={props.actor} onChange={(event) => props.onActorChange(event.target.value as DashboardActor)}>
              {dashboardActors.map((item) => (
                <option key={item} value={item} disabled={item === "PARTNER" && !props.hasActivePartnerConnection}>
                  {item === "EVERYONE" ? "Everyone" : item === "ME" ? "Me" : "Partner"}
                </option>
              ))}
            </SelectField>
          </label>
        </div>
      </CardContent>
    </Card>
  );
}
