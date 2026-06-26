"use client";

import { createContext, useContext, useMemo, useSyncExternalStore } from "react";
import { useTheme } from "next-themes";

const ThemeContext = createContext();

function ThemeContextProvider({ children }) {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    (onStoreChange) => {
      const timeoutId = window.setTimeout(onStoreChange, 0);
      return () => window.clearTimeout(timeoutId);
    },
    () => true,
    () => false,
  );
  const isDark = resolvedTheme === "dark";

  const value = useMemo(
    () => ({
      isDark,
      mounted,
      setIsDark(nextValue) {
        const nextIsDark =
          typeof nextValue === "function" ? nextValue(isDark) : nextValue;
        setTheme(nextIsDark ? "dark" : "light");
      },
      setTheme,
    }),
    [isDark, mounted, setTheme],
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

function useThemeContext() {
  const context = useContext(ThemeContext);
  return context;
}
export { ThemeContextProvider, useThemeContext };
