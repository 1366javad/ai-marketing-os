"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useTheme } from "next-themes";

const ThemeContext = createContext();

function ThemeContextProvider({ children }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const isDark = resolvedTheme === "dark";

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setMounted(true), 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

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
