"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useThemeContext } from "@/app/lib/context/ThemeContext";

export default function ThemeToggle() {
  const { isDark, mounted, setIsDark } = useThemeContext();

  function handelToggle() {
    setIsDark((isDark) => !isDark);
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="p-3 rounded-xl hover:scale-105 hover:bg-slate-200 dark:hover:bg-slate-800 transition-all"
      onClick={handelToggle}
      disabled={!mounted}
      aria-label="Toggle theme"
    >
      <div className="relative h-11 w-12">
        {!mounted ? null : isDark ? (
          <Sun className="w-11 h-11" />
        ) : (
          <Moon className="w-11 h-11" />
        )}
      </div>
    </Button>
  );
}
