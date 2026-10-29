import { useTranslation } from "react-i18next";
import { useTheme } from "next-themes";
import { SunIcon, MoonIcon, MonitorIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Three-position theme switch: system (auto), light, dark. */
export function ThemeSwitcher() {
  const { t } = useTranslation("common");
  const { theme, setTheme } = useTheme();

  const button = (value: "system" | "light" | "dark", label: string, Icon: typeof MonitorIcon) => (
    <button
      type="button"
      onClick={() => setTheme(value)}
      title={label}
      aria-label={label}
      className={cn(
        "flex h-6 flex-1 items-center justify-center rounded-[5px] transition-colors",
        theme === value ? "bg-accent text-text-primary" : "text-text-muted hover:text-text-secondary",
      )}
    >
      <Icon className="size-3.5" />
    </button>
  );

  return (
    <div className="flex items-center gap-0.5 rounded-md border border-border bg-card p-0.5">
      {button("system", t("theme.auto"), MonitorIcon)}
      {button("light", t("theme.light"), SunIcon)}
      {button("dark", t("theme.dark"), MoonIcon)}
    </div>
  );
}
