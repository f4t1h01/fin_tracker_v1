import { SelectField } from "@/components/ui/select-field";

import { type DashboardViewMode } from "@/components/profile/types";

const viewLabels: Record<DashboardViewMode, string> = {
  COUPLE: "Shared view",
  PERSONAL: "Personal view"
};

type DashboardViewSelectProps = {
  value: DashboardViewMode;
  options: DashboardViewMode[];
  onChange: (value: DashboardViewMode) => void;
};

export function DashboardViewSelect(props: DashboardViewSelectProps) {
  return (
    <label className="space-y-1 text-sm">
      <span className="field-label">Finance view</span>
      <SelectField value={props.value} onChange={(event) => props.onChange(event.target.value as DashboardViewMode)} className="min-w-[148px]">
        {props.options.map((view) => (
          <option key={view} value={view}>
            {viewLabels[view]}
          </option>
        ))}
      </SelectField>
    </label>
  );
}
