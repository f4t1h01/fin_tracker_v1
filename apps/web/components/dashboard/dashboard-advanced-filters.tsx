"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";

import { buildCategoryOptions } from "@/components/profile/category-options";
import { dashboardActors, dashboardKinds, type CategoryCatalogResponse, type DashboardActor, type DashboardKind, type DashboardViewMode } from "@/components/profile/types";

type DashboardAdvancedFiltersProps = {
  categoryCatalog: CategoryCatalogResponse | null;
  viewMode: DashboardViewMode;
  kind: DashboardKind;
  categoryId: string;
  actor: DashboardActor;
  searchDraft: string;
  timeFrom: string;
  timeTo: string;
  onKindChange: (value: DashboardKind) => void;
  onCategoryChange: (value: string) => void;
  onActorChange: (value: DashboardActor) => void;
  onSearchDraftChange: (value: string) => void;
  onTimeFromChange: (value: string) => void;
  onTimeToChange: (value: string) => void;
};

export function DashboardAdvancedFilters(props: DashboardAdvancedFiltersProps) {
  const expenseOptions = buildCategoryOptions(props.categoryCatalog, "EXPENSE");
  const incomeOptions = buildCategoryOptions(props.categoryCatalog, "INCOME");

  const renderCategoryOptions = () => {
    if (!props.categoryCatalog) {
      return null;
    }

    if (props.kind === "INCOME") {
      return (
        <>
          {incomeOptions.personal.length > 0 ? (
            <optgroup label="Income / My categories">
              {incomeOptions.personal.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </optgroup>
          ) : null}
          {incomeOptions.shared.length > 0 ? (
            <optgroup label="Income / Shared categories">
              {incomeOptions.shared.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
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
              {expenseOptions.personal.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </optgroup>
          ) : null}
          {expenseOptions.shared.length > 0 ? (
            <optgroup label="Expense / Shared categories">
              {expenseOptions.shared.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </optgroup>
          ) : null}
        </>
      );
    }

    return (
      <>
        {expenseOptions.personal.length > 0 ? (
          <optgroup label="Expense / My categories">
            {expenseOptions.personal.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </optgroup>
        ) : null}
        {expenseOptions.shared.length > 0 ? (
          <optgroup label="Expense / Shared categories">
            {expenseOptions.shared.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </optgroup>
        ) : null}
        {incomeOptions.personal.length > 0 ? (
          <optgroup label="Income / My categories">
            {incomeOptions.personal.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </optgroup>
        ) : null}
        {incomeOptions.shared.length > 0 ? (
          <optgroup label="Income / Shared categories">
            {incomeOptions.shared.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </optgroup>
        ) : null}
      </>
    );
  };

  return (
    <Card className="panel-soft mb-6">
      <CardHeader>
        <CardTitle>Filters</CardTitle>
        <CardDescription>Search transactions, narrow by category, and trim the time window without overcrowding the primary toolbar.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-1 text-sm">
            <span className="field-label">Search</span>
            <TextField
              type="search"
              value={props.searchDraft}
              onChange={(event) => props.onSearchDraftChange(event.target.value)}
              placeholder="note or category"
            />
          </label>
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
                <option key={item} value={item}>
                  {item === "EVERYONE" ? "Everyone" : item === "ME" ? "Me" : props.viewMode === "PERSONAL" ? "Partner unavailable" : "Partner"}
                </option>
              ))}
            </SelectField>
          </label>
          <label className="space-y-1 text-sm">
            <span className="field-label">Time from</span>
            <TextField type="time" value={props.timeFrom} onChange={(event) => props.onTimeFromChange(event.target.value)} />
          </label>
          <label className="space-y-1 text-sm">
            <span className="field-label">Time to</span>
            <TextField type="time" value={props.timeTo} onChange={(event) => props.onTimeToChange(event.target.value)} />
          </label>
        </div>
      </CardContent>
    </Card>
  );
}
