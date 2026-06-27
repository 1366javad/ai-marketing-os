"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useThemeContext } from "@/app/lib/context/ThemeContext";

export default function ThemeToggle() {
  const { isDark, setIsDark } = useThemeContext();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setMounted(true), 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  function handleToggle() {
    if (!mounted) return;
    setIsDark((isDark) => !isDark);
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="p-3 rounded-xl hover:scale-105 hover:bg-slate-200 dark:hover:bg-slate-800 transition-all"
      onClick={handleToggle}
      aria-label="Toggle theme"
    >
      <div className="relative h-4 w-12">
        {!mounted ? (
          <span className="block h-11 w-11" aria-hidden="true" />
        ) : isDark ? (
          <Sun className="w-11 h-11" />
        ) : (
          <Moon className="w-11 h-11" />
        )}
      </div>
    </Button>
  );
}
