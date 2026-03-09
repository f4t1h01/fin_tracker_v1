"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";

import { routeTransitionNavigationDelayMs } from "./route-transition-config";
import { useRouteTransition } from "./route-transition-provider";

type AppLinkProps = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string;
  prefetch?: boolean;
  transition?: boolean;
};

function isModifiedClick(event: React.MouseEvent<HTMLAnchorElement>) {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0;
}

const AppLink = React.forwardRef<HTMLAnchorElement, AppLinkProps>(
  ({ href, onClick, onMouseEnter, prefetch = true, transition = true, target, rel, ...props }, ref) => {
    const router = useRouter();
    const pathname = usePathname();
    const { beginTransition } = useRouteTransition();
    const navigationTimerRef = React.useRef<number | null>(null);
    const isInternal = href.startsWith("/");

    React.useEffect(
      () => () => {
        if (navigationTimerRef.current !== null) {
          window.clearTimeout(navigationTimerRef.current);
        }
      },
      []
    );

    const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
      onClick?.(event);

      if (event.defaultPrevented || !isInternal || !transition || target === "_blank" || isModifiedClick(event)) {
        return;
      }

      if (href === pathname) {
        event.preventDefault();
        return;
      }

      event.preventDefault();
      beginTransition(href);

      if (navigationTimerRef.current !== null) {
        window.clearTimeout(navigationTimerRef.current);
      }

      navigationTimerRef.current = window.setTimeout(() => {
        router.push(href);
      }, routeTransitionNavigationDelayMs);
    };

    const handleMouseEnter = (event: React.MouseEvent<HTMLAnchorElement>) => {
      onMouseEnter?.(event);
      if (isInternal && prefetch) {
        void router.prefetch(href);
      }
    };

    if (!isInternal) {
      return <a ref={ref} href={href} target={target} rel={rel} onClick={onClick} onMouseEnter={onMouseEnter} {...props} />;
    }

    return <Link ref={ref} href={href} prefetch={prefetch} target={target} rel={rel} onClick={handleClick} onMouseEnter={handleMouseEnter} {...props} />;
  }
);

AppLink.displayName = "AppLink";

export { AppLink };
