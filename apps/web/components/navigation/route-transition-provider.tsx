"use client";

import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import { routeTransitionDurationCssValue, routeTransitionMinimumVisibleMs } from "./route-transition-config";

type RouteTransitionContextValue = {
  beginTransition: (href: string) => void;
  completeTransition: () => void;
  isTransitioning: boolean;
  pendingPath: string | null;
};

const RouteTransitionContext = createContext<RouteTransitionContextValue | null>(null);

export function normalizeInternalPath(href: string) {
  return href.split("#")[0]?.split("?")[0] ?? href;
}

export function RouteTransitionProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const completionTimerRef = useRef<number | null>(null);
  const transitionStartedAtRef = useRef<number | null>(null);
  const startedFromPathRef = useRef(pathname);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [pendingPath, setPendingPath] = useState<string | null>(null);

  const clearCompletionTimer = useCallback(() => {
    if (completionTimerRef.current !== null) {
      window.clearTimeout(completionTimerRef.current);
      completionTimerRef.current = null;
    }
  }, []);

  const finishTransition = useCallback(() => {
    clearCompletionTimer();
    transitionStartedAtRef.current = null;
    setIsTransitioning(false);
    setPendingPath(null);
  }, [clearCompletionTimer]);

  const completeTransition = useCallback(() => {
    const elapsed = transitionStartedAtRef.current === null ? routeTransitionMinimumVisibleMs : window.performance.now() - transitionStartedAtRef.current;
    const remaining = Math.max(0, routeTransitionMinimumVisibleMs - elapsed);

    clearCompletionTimer();

    if (remaining === 0) {
      finishTransition();
      return;
    }

    completionTimerRef.current = window.setTimeout(finishTransition, remaining);
  }, [clearCompletionTimer, finishTransition]);

  const beginTransition = useCallback(
    (href: string) => {
      const nextPath = normalizeInternalPath(href);
      if (!nextPath || nextPath === pathname) {
        return;
      }

      clearCompletionTimer();
      startedFromPathRef.current = pathname;
      transitionStartedAtRef.current = window.performance.now();
      setPendingPath(nextPath);
      setIsTransitioning(true);
    },
    [clearCompletionTimer, pathname]
  );

  useEffect(() => {
    if (!isTransitioning || pathname === startedFromPathRef.current || !pendingPath || pathname === pendingPath) {
      return;
    }

    setPendingPath(pathname);
  }, [isTransitioning, pathname, pendingPath]);

  useEffect(() => {
    return () => clearCompletionTimer();
  }, [clearCompletionTimer]);

  const value = useMemo<RouteTransitionContextValue>(
    () => ({ beginTransition, completeTransition, isTransitioning, pendingPath }),
    [beginTransition, completeTransition, isTransitioning, pendingPath]
  );

  return (
    <RouteTransitionContext.Provider value={value}>
      <div className={`page-shell${isTransitioning ? " page-shell--transitioning" : ""}`} style={{ "--route-transition-duration": routeTransitionDurationCssValue } as React.CSSProperties}>{children}</div>
      <div className={`route-transition-layer${isTransitioning ? " is-active" : ""}`} style={{ "--route-transition-duration": routeTransitionDurationCssValue } as React.CSSProperties} aria-hidden={!isTransitioning}>
        <div className="route-transition-backdrop" />
      </div>
    </RouteTransitionContext.Provider>
  );
}

export function useRouteTransition() {
  const context = useContext(RouteTransitionContext);
  if (!context) {
    throw new Error("useRouteTransition must be used within RouteTransitionProvider");
  }

  return context;
}

export function useRouteTransitionPageReady(isReady: boolean) {
  const pathname = usePathname();
  const { completeTransition, isTransitioning, pendingPath } = useRouteTransition();

  useEffect(() => {
    if (!isReady || !isTransitioning || !pendingPath || pathname !== pendingPath) {
      return;
    }

    completeTransition();
  }, [completeTransition, isReady, isTransitioning, pathname, pendingPath]);
}
