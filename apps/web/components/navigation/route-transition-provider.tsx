"use client";

import { Loader2 } from "lucide-react";
import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

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
  const loadingTimerRef = useRef<number | null>(null);
  const startedFromPathRef = useRef(pathname);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showLoading, setShowLoading] = useState(false);
  const [pendingPath, setPendingPath] = useState<string | null>(null);

  const clearLoadingTimer = useCallback(() => {
    if (loadingTimerRef.current !== null) {
      window.clearTimeout(loadingTimerRef.current);
      loadingTimerRef.current = null;
    }
  }, []);

  const completeTransition = useCallback(() => {
    clearLoadingTimer();
    setShowLoading(false);
    setIsTransitioning(false);
    setPendingPath(null);
  }, [clearLoadingTimer]);

  const beginTransition = useCallback(
    (href: string) => {
      const nextPath = normalizeInternalPath(href);
      if (!nextPath || nextPath === pathname) {
        return;
      }

      clearLoadingTimer();
      startedFromPathRef.current = pathname;
      setPendingPath(nextPath);
      setShowLoading(false);
      setIsTransitioning(true);
      loadingTimerRef.current = window.setTimeout(() => setShowLoading(true), 1500);
    },
    [clearLoadingTimer, pathname]
  );

  useEffect(() => {
    if (!isTransitioning || pathname === startedFromPathRef.current || !pendingPath || pathname === pendingPath) {
      return;
    }

    setPendingPath(pathname);
  }, [isTransitioning, pathname, pendingPath]);

  useEffect(() => {
    return () => clearLoadingTimer();
  }, [clearLoadingTimer]);

  const value = useMemo<RouteTransitionContextValue>(
    () => ({ beginTransition, completeTransition, isTransitioning, pendingPath }),
    [beginTransition, completeTransition, isTransitioning, pendingPath]
  );

  return (
    <RouteTransitionContext.Provider value={value}>
      <div className="page-shell">{children}</div>
      <div className={`route-transition-layer${isTransitioning ? " is-active" : ""}${showLoading ? " is-loading" : ""}`} aria-hidden={!isTransitioning}>
        <div className="route-transition-backdrop" />
        {showLoading ? (
          <div className="route-transition-panel">
            <Loader2 className="size-5 animate-spin text-pop" />
            <div>
              <p className="route-transition-title">Loading next view</p>
              <p className="route-transition-copy">Keeping your context warm while the route finishes preparing.</p>
            </div>
          </div>
        ) : null}
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
