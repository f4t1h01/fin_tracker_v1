import { SelectField } from "@/components/ui/select-field";

import { dashboardKinds, type DashboardKind } from "@/components/profile/types";

const kindLabels: Record<DashboardKind, string> = {
  ALL: "All",
  EXPENSE: "Expense",
  INCOME: "Income"
};

type DashboardKindSelectProps = {
  value: DashboardKind;
  onChange: (value: DashboardKind) => void;
};

export function DashboardKindSelect(props: DashboardKindSelectProps) {
  return (
    <label className="space-y-1 text-sm">
      <span className="field-label">Kind</span>
      <SelectField value={props.value} onChange={(event) => props.onChange(event.target.value as DashboardKind)} className="min-w-[140px]">
        {dashboardKinds.map((item) => (
          <option key={item} value={item}>
            {kindLabels[item]}
          </option>
        ))}
      </SelectField>
    </label>
  );
}
