import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { SelectField } from "@/components/ui/select-field";

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
};

export function DashboardRangeFilter(props: DashboardRangeFilterProps) {
  const isCustom = props.preset === "CUSTOM";
  const isSpecificMonth = props.preset === "SPECIFIC_MONTH";

  return (
    <Card className="panel-soft mb-6">
      <CardHeader>
        <CardTitle>Range</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,220px)_1fr]">
          <label className="space-y-1 text-sm">
            <span className="field-label">Range</span>
            <SelectField value={props.preset} onChange={(event) => props.onPresetChange(event.target.value as DashboardRangePreset)}>
              {dashboardRangePresets.map((preset) => (
                <option key={preset} value={preset}>
                  {presetLabels[preset]}
                </option>
              ))}
            </SelectField>
          </label>

          {isCustom ? (
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span className="field-label">From</span>
                <DatePicker value={props.draftFrom} onChange={props.onDraftFromChange} />
              </label>
              <label className="space-y-1 text-sm">
                <span className="field-label">To</span>
                <DatePicker value={props.draftTo} onChange={props.onDraftToChange} />
              </label>
            </div>
          ) : isSpecificMonth ? (
            <label className="space-y-1 text-sm md:max-w-[220px]">
              <span className="field-label">Month</span>
              <DatePicker mode="month" value={props.draftMonthKey} onChange={props.onDraftMonthKeyChange} />
            </label>
          ) : (
            <div className="detail-box flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">{props.activeLabel}</p>
                <p className="body-muted text-sm">
                  {props.activeFrom} to {props.activeTo}
                </p>
              </div>
            </div>
          )}
        </div>

        {props.isRefreshing ? <p className="body-muted text-xs uppercase tracking-[0.16em]">Refreshing</p> : null}
        <p className="body-muted text-xs uppercase tracking-[0.16em]">{weekStartLabels[props.weekStartsOn]} week start</p>
      </CardContent>
    </Card>
  );
}
