"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";
import NavigationProgressBar from "@/components/ui/NavigationProgressBar";

const NavigationContext = createContext(null);
const MIN_VISIBLE_MS = 500;
const MAX_VISIBLE_MS = 15000;

export function NavigationProvider({ children }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const navigationKey = `${pathname}?${searchParams.toString()}`;
  const [pendingNavigation, setPendingNavigation] = useState(null);
  const isNavigating = Boolean(pendingNavigation);

  const startNavigation = useCallback(() => {
    const startedAt = Date.now();
    setPendingNavigation({
      from: navigationKey,
      startedAt,
    });
    window.setTimeout(() => {
      setPendingNavigation((current) =>
        current?.startedAt === startedAt ? null : current,
      );
    }, MAX_VISIBLE_MS);
  }, [navigationKey]);

  useEffect(() => {
    if (!pendingNavigation || pendingNavigation.from === navigationKey) return;

    const elapsed = Date.now() - pendingNavigation.startedAt;
    const remaining = Math.max(MIN_VISIBLE_MS - elapsed, 0);
    const timer = window.setTimeout(() => {
      setPendingNavigation((current) =>
        current?.startedAt === pendingNavigation.startedAt ? null : current,
      );
    }, remaining);

    return () => window.clearTimeout(timer);
  }, [navigationKey, pendingNavigation]);

  useEffect(() => {
    function handleClick(event) {
      const anchor = event.target.closest?.("a[href]");
      if (!anchor || event.defaultPrevented) return;
      if (
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey
      ) {
        return;
      }

      const target = anchor.getAttribute("target");
      const href = anchor.getAttribute("href");
      if (!href || target === "_blank" || href.startsWith("#")) return;

      const nextUrl = new URL(anchor.href, window.location.href);
      if (nextUrl.origin !== window.location.origin) return;
      if (
        nextUrl.pathname === window.location.pathname &&
        nextUrl.search === window.location.search
      ) {
        return;
      }

      startNavigation();
    }

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [startNavigation]);

  const value = useMemo(
    () => ({ isNavigating, startNavigation }),
    [isNavigating, startNavigation],
  );

  return (
    <NavigationContext.Provider value={value}>
      {children}
      {isNavigating && <NavigationProgressBar />}
    </NavigationContext.Provider>
  );
}

export function useNavigationProgress() {
  const context = useContext(NavigationContext);
  if (!context) {
    return { isNavigating: false, startNavigation: () => {} };
  }
  return context;
}
