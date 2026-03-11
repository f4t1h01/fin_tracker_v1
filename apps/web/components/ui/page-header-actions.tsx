import type { ReactNode } from "react";

type PageHeaderActionsProps = {
  children: ReactNode;
};

export function PageHeaderActions(props: PageHeaderActionsProps) {
  return (
    <div className="flex shrink-0 flex-wrap items-center justify-start gap-3 self-start sm:ml-auto sm:justify-end">
      {props.children}
    </div>
  );
}
