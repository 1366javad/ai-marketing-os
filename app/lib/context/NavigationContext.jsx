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

const NavigationContext = createContext(null);

export function NavigationProvider({ children }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const navigationKey = `${pathname}?${searchParams.toString()}`;
  const [pendingNavigation, setPendingNavigation] = useState(null);
  const isNavigating = pendingNavigation?.from === navigationKey;

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
    }, 15000);
  }, [navigationKey]);

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
      {isNavigating && <NavigationIndicator />}
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

function NavigationIndicator() {
  return (
    <div className="fixed inset-x-0 top-0 z-[100] h-0.5 overflow-hidden bg-[#3B3CFF]/15">
      <div className="h-full w-1/3 animate-navigation-progress bg-[#3B3CFF]" />
    </div>
  );
}
