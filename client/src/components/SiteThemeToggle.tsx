import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

export function SiteThemeToggle({ compact = false, className = "" }: { compact?: boolean; className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const dark = theme === "dark";
  const label = dark ? "Use light theme" : "Use dark theme";
  return <button type="button" onClick={toggleTheme} aria-label={label} aria-pressed={dark} title={label} className={`site-theme-toggle ${compact ? "site-theme-toggle-compact" : ""} ${className}`}>{dark ? <Sun size={16} /> : <Moon size={16} />}<span className={compact ? "sr-only" : ""}>{dark ? "Light view" : "Night view"}</span></button>;
}
