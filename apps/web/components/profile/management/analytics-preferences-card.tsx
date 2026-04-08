import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SelectField } from "@/components/ui/select-field";

import { weekStartDays, type WeekStartDay } from "../types";

const weekStartLabels: Record<WeekStartDay, string> = {
  MONDAY: "Monday",
  TUESDAY: "Tuesday",
  WEDNESDAY: "Wednesday",
  THURSDAY: "Thursday",
  FRIDAY: "Friday",
  SATURDAY: "Saturday",
  SUNDAY: "Sunday"
};

type AnalyticsPreferencesCardProps = {
  weekStartsOn: WeekStartDay;
  setWeekStartsOn: (value: WeekStartDay) => void;
  isSavingPreferences: boolean;
  preferencesMessage: string | null;
  preferencesError: string | null;
  onSavePreferences: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
};

export function AnalyticsPreferencesCard(props: AnalyticsPreferencesCardProps) {
  return (
    <Card className="panel-soft">
      <CardHeader>
        <CardTitle>Analytics settings</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-3" onSubmit={props.onSavePreferences}>
          <label className="space-y-1 text-sm">
            <span className="field-label">Week starts on</span>
            <SelectField value={props.weekStartsOn} onChange={(event) => props.setWeekStartsOn(event.target.value as WeekStartDay)}>
              {weekStartDays.map((day) => (
                <option key={day} value={day}>
                  {weekStartLabels[day]}
                </option>
              ))}
            </SelectField>
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={props.isSavingPreferences} pending={props.isSavingPreferences} pendingText="Saving...">Save settings</Button>
            {props.preferencesMessage ? <p className="status-success text-sm">{props.preferencesMessage}</p> : null}
            {props.preferencesError ? <p className="status-error text-sm">{props.preferencesError}</p> : null}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
