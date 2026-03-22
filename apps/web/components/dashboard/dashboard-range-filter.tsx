import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";

import { dashboardRangePresets, type DashboardRangePreset, type WeekStartDay } from "@/components/profile/types";

const presetLabels: Record<DashboardRangePreset, string> = {
  THIS_WEEK: "This week",
  THIS_MONTH: "This month",
  SPECIFIC_MONTH: "Specific month",
  CUSTOM: "Custom range"
};

const weekStartLabels: Record<WeekStartDay, string> = {
  MONDAY: "Monday",
  TUESDAY: "Tuesday",
  WEDNESDAY: "Wednesday",
  THURSDAY: "Thursday",
  FRIDAY: "Friday",
  SATURDAY: "Saturday",
  SUNDAY: "Sunday"
};

type DashboardRangeFilterProps = {
  preset: DashboardRangePreset;
  draftFrom: string;
  draftTo: string;
  draftMonthKey: string;
  isRefreshing: boolean;
  weekStartsOn: WeekStartDay;
  activeLabel: string;
  activeFrom: string;
  activeTo: string;
  onPresetChange: (value: DashboardRangePreset) => void;
  onDraftFromChange: (value: string) => void;
  onDraftToChange: (value: string) => void;
  onDraftMonthKeyChange: (value: string) => void;
  onApplyCustom: () => void;
  onApplyMonth: () => void;
};

export function DashboardRangeFilter(props: DashboardRangeFilterProps) {
  const isCustom = props.preset === "CUSTOM";
  const isSpecificMonth = props.preset === "SPECIFIC_MONTH";

  return (
    <Card className="panel-soft mb-6">
      <CardHeader>
        <CardTitle>Range filter</CardTitle>
        <CardDescription>Use calendar-based presets or pick an exact date span. Week-based results respect your {weekStartLabels[props.weekStartsOn]} start-day setting.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,220px)_1fr]">
          <label className="space-y-1 text-sm">
            <span className="field-label">Date range</span>
            <SelectField value={props.preset} onChange={(event) => props.onPresetChange(event.target.value as DashboardRangePreset)}>
              {dashboardRangePresets.map((preset) => (
                <option key={preset} value={preset}>
                  {presetLabels[preset]}
                </option>
              ))}
            </SelectField>
          </label>
          {isCustom ? (
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
              <label className="space-y-1 text-sm">
                <span className="field-label">From</span>
                <DatePicker value={props.draftFrom} onChange={props.onDraftFromChange} />
              </label>
              <label className="space-y-1 text-sm">
                <span className="field-label">To</span>
                <DatePicker value={props.draftTo} onChange={props.onDraftToChange} />
              </label>
              <div className="flex items-end">
                <Button type="button" disabled={props.isRefreshing || !props.draftFrom || !props.draftTo} onClick={props.onApplyCustom}>
                  {props.isRefreshing ? "Applying..." : "Apply range"}
                </Button>
              </div>
            </div>
          ) : isSpecificMonth ? (
            <div className="grid gap-3 md:grid-cols-[minmax(0,220px)_auto]">
              <label className="space-y-1 text-sm">
                <span className="field-label">Month</span>
                <TextField type="month" value={props.draftMonthKey} onChange={(event) => props.onDraftMonthKeyChange(event.target.value)} />
              </label>
              <div className="flex items-end">
                <Button type="button" disabled={props.isRefreshing || !props.draftMonthKey} onClick={props.onApplyMonth}>
                  {props.isRefreshing ? "Applying..." : "Apply month"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="detail-box flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Active range</p>
                <p className="body-muted text-sm">{props.activeLabel}: {props.activeFrom} to {props.activeTo}</p>
              </div>
              {props.isRefreshing ? <span className="body-muted text-xs uppercase tracking-[0.16em]">Refreshing</span> : null}
            </div>
          )}
        </div>
        {isCustom ? <p className="body-muted text-sm">Custom range uses whole selected dates on the backend, from 00:00 on the first day through the next 00:00 after the end day.</p> : null}
        {isSpecificMonth ? <p className="body-muted text-sm">Specific month groups the full selected month, from the first day through the next month boundary.</p> : null}
      </CardContent>
    </Card>
  );
}
