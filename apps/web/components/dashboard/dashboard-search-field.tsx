import { TextField } from "@/components/ui/text-field";

type DashboardSearchFieldProps = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

export function DashboardSearchField(props: DashboardSearchFieldProps) {
  return (
    <label className={`space-y-1 text-sm ${props.className ?? ""}`.trim()}>
      <span className="field-label">Search</span>
      <TextField
        type="search"
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        placeholder="note or category"
      />
    </label>
  );
}
