import type { ReactNode } from "react";

type PageHeaderActionsProps = {
  children: ReactNode;
};

export function PageHeaderActions(props: PageHeaderActionsProps) {
  return (
    <div className="flex w-full flex-wrap items-center justify-start gap-3 sm:w-auto sm:justify-end sm:self-start">
      {props.children}
    </div>
  );
}
