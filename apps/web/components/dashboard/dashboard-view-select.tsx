import { SelectField } from "@/components/ui/select-field";

import { type DashboardViewMode } from "@/components/profile/types";

const viewLabels: Record<DashboardViewMode, string> = {
  COUPLE: "Shared view",
  PERSONAL: "Personal view"
};

type DashboardViewSelectProps = {
  value: DashboardViewMode;
  options: readonly DashboardViewMode[];
  disabledOptions?: readonly DashboardViewMode[];
  onChange: (value: DashboardViewMode) => void;
};

export function DashboardViewSelect(props: DashboardViewSelectProps) {
  return (
    <label className="space-y-1 text-sm">
      <span className="field-label">View</span>
      <SelectField value={props.value} onChange={(event) => props.onChange(event.target.value as DashboardViewMode)} className="min-w-[148px]">
        {props.options.map((view) => (
          <option key={view} value={view} disabled={props.disabledOptions?.includes(view)}>
            {viewLabels[view]}
          </option>
        ))}
      </SelectField>
    </label>
  );
}
