import { Check, ChevronDown } from "lucide-react";
import * as React from "react";

import { useDismissableLayer } from "@/components/ui/use-dismissable-layer";
import { cn } from "@/lib/cn";

export type SelectFieldProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  placeholder?: string;
};

type SelectOptionItem = {
  disabled: boolean;
  label: string;
  value: string;
};

function readNodeText(node: React.ReactNode): string {
  if (node == null || typeof node === "boolean") {
    return "";
  }

  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map(readNodeText).join("");
  }

  if (React.isValidElement<{ children?: React.ReactNode }>(node)) {
    return readNodeText(node.props.children);
  }

  return "";
}

const SelectField = React.forwardRef<HTMLSelectElement, SelectFieldProps>(({ className, children, disabled, name, onBlur, onChange, placeholder, required, value, ...props }, ref) => {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  const panelRef = React.useRef<HTMLDivElement | null>(null);

  const options = React.useMemo<SelectOptionItem[]>(() => {
    return React.Children.toArray(children).flatMap((child) => {
      if (!React.isValidElement<React.OptionHTMLAttributes<HTMLOptionElement>>(child) || child.type !== "option") {
        return [];
      }

      return [{
        disabled: Boolean(child.props.disabled),
        label: readNodeText(child.props.children),
        value: String(child.props.value ?? "")
      }];
    });
  }, [children]);

  const normalizedValue = value == null ? "" : String(value);
  const selectedOption = options.find((option) => option.value === normalizedValue) ?? null;

  useDismissableLayer({
    open,
    onDismiss: () => setOpen(false),
    refs: [rootRef, panelRef]
  });

  const emitChange = React.useCallback((nextValue: string) => {
    onChange?.({
      currentTarget: { value: nextValue } as HTMLSelectElement,
      target: { value: nextValue } as HTMLSelectElement
    } as React.ChangeEvent<HTMLSelectElement>);
  }, [onChange]);

  const handleSelect = React.useCallback((nextValue: string) => {
    emitChange(nextValue);
    setOpen(false);
    triggerRef.current?.focus();
  }, [emitChange]);

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <select ref={ref} className="hidden" aria-hidden="true" tabIndex={-1} disabled={disabled} name={name} required={required} value={normalizedValue} onChange={onChange} {...props}>
        {children}
      </select>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="field-control field-select flex w-full items-center justify-between gap-3 text-left"
        onClick={() => setOpen((current) => !current)}
        onBlur={(event) => onBlur?.({
          ...event,
          currentTarget: event.currentTarget as unknown as HTMLSelectElement,
          target: event.target as unknown as HTMLSelectElement
        })}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " " || event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        <span className={cn("truncate", selectedOption ? "text-[var(--ink)]" : "text-[var(--ink-soft)]")}>
          {selectedOption?.label ?? placeholder ?? "Select"}
        </span>
        <ChevronDown className={cn("size-4 shrink-0 text-[var(--ink-soft)] transition-transform duration-200", open ? "rotate-180" : "")} />
      </button>
      {open ? (
        <div
          ref={panelRef}
          role="listbox"
          className="absolute left-0 top-full z-30 mt-2 max-h-64 w-full overflow-y-auto rounded-xl border border-[rgba(201,168,76,0.2)] bg-[color-mix(in_srgb,var(--warm-white)_92%,transparent)] p-2 shadow-[0_18px_48px_rgba(26,20,16,0.18)] backdrop-blur-md dark:bg-[color-mix(in_srgb,var(--warm-white)_82%,transparent)]"
        >
          {options.map((option) => {
            const isSelected = option.value === normalizedValue;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                disabled={option.disabled}
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-[10px] px-3 py-2 text-left text-sm transition-colors",
                  isSelected ? "bg-[color-mix(in_srgb,var(--gold)_12%,transparent)] text-[var(--ink)]" : "text-[var(--ink-soft)] hover:bg-[color-mix(in_srgb,var(--gold)_8%,transparent)] hover:text-[var(--ink)]",
                  option.disabled ? "cursor-not-allowed opacity-45" : ""
                )}
                onClick={() => handleSelect(option.value)}
              >
                <span className="truncate">{option.label}</span>
                {isSelected ? <Check className="size-4 shrink-0 text-[var(--gold)]" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
});

SelectField.displayName = "SelectField";

export { SelectField };
