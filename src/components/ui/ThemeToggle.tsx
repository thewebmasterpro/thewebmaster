"use client";

import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";

const emptySubscribe = () => () => {};
function useIsMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

// =============================================================================
// THEME TOGGLE - Simple
// Two-state toggle: light/dark
// =============================================================================

interface ThemeToggleProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: "w-4 h-4",
  md: "w-5 h-5",
  lg: "w-6 h-6",
};

const buttonSizeMap = {
  sm: "p-1.5",
  md: "p-2",
  lg: "p-2.5",
};

export function ThemeToggle({ className, size = "md" }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const mounted = useIsMounted();

  if (!mounted) {
    return (
      <button
        className={cn(
          "rounded-md bg-muted",
          buttonSizeMap[size],
          className
        )}
      >
        <span className={cn("block bg-muted-foreground/20 rounded", sizeMap[size])} />
      </button>
    );
  }

  const isDark = theme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "rounded-md hover:bg-muted transition-colors",
        buttonSizeMap[size],
        className
      )}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
    >
      {isDark ? (
        <Sun className={cn(sizeMap[size], "text-foreground")} />
      ) : (
        <Moon className={cn(sizeMap[size], "text-foreground")} />
      )}
    </button>
  );
}

// =============================================================================
// THEME SWITCHER - With System Option
// Three options: light, dark, system
// =============================================================================

interface ThemeSwitcherProps {
  className?: string;
}

export function ThemeSwitcher({ className }: ThemeSwitcherProps) {
  const { theme, setTheme } = useTheme();
  const mounted = useIsMounted();

  if (!mounted) {
    return (
      <div className={cn("flex gap-1 p-1 rounded-lg bg-muted", className)}>
        {[1, 2, 3].map((i) => (
          <span key={i} className="w-8 h-8 rounded-md bg-muted-foreground/20" />
        ))}
      </div>
    );
  }

  const options = [
    { value: "light", icon: Sun, label: "Light" },
    { value: "dark", icon: Moon, label: "Dark" },
    { value: "system", icon: Monitor, label: "System" },
  ] as const;

  return (
    <div className={cn("flex gap-1 p-1 rounded-lg bg-muted", className)}>
      {options.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          className={cn(
            "p-2 rounded-md transition-colors",
            theme === value
              ? "bg-background shadow-sm"
              : "hover:bg-background/50"
          )}
          aria-label={`${label} theme`}
        >
          <Icon className="w-4 h-4" />
        </button>
      ))}
    </div>
  );
}

// =============================================================================
// THEME SELECT - Dropdown
// For settings pages
// =============================================================================

export function ThemeSelect({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const mounted = useIsMounted();

  if (!mounted) {
    return (
      <select className={cn("bg-muted rounded-md px-3 py-2", className)} disabled>
        <option>Loading...</option>
      </select>
    );
  }

  return (
    <select
      value={theme}
      onChange={(e) => setTheme(e.target.value)}
      className={cn(
        "bg-background border rounded-md px-3 py-2 text-sm",
        "focus:outline-none focus:ring-2 focus:ring-ring",
        className
      )}
    >
      <option value="light">Light</option>
      <option value="dark">Dark</option>
      <option value="system">System</option>
    </select>
  );
}
