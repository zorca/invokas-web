import { useTranslation } from "react-i18next";
import {
  FileTextIcon,
  UsersIcon,
  SettingsIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { InvokasMark } from "@/components/InvokasMark";
import { ThemeSwitcher } from "@/components/layout/ThemeSwitcher";
import { AdBanner } from "@/components/layout/AdBanner";
import { VIRTUVESPASAULIS_AD, AD_SLOT_COUNT, type Ad } from "@/lib/ads";
import type { Page } from "@/lib/navigation";

interface AppSidebarProps {
  page: Page;
  navigate: (page: Page) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function AppSidebar({ page, navigate, collapsed, onToggleCollapse }: AppSidebarProps) {
  const { t } = useTranslation("common");

  const items: { key: Page["name"]; icon: typeof FileTextIcon; label: string }[] = [
    { key: "invoices", icon: FileTextIcon, label: t("nav.invoices") },
    { key: "clients", icon: UsersIcon, label: t("nav.clients") },
    { key: "settings", icon: SettingsIcon, label: t("nav.settings") },
  ];

  // A detail page keeps the section it was opened from highlighted.
  const sections: Partial<Record<Page["name"], Page["name"]>> = {
    invoice: "invoices",
    client: "clients",
  };
  const active = sections[page.name] ?? page.name;

  // Slot 1 is a paid ad; the remaining slots fall back to the generic placeholder.
  const placeholderAd: Ad = {
    id: "placeholder",
    label: t("banner.label"),
    title: t("banner.title"),
    promo: t("banner.price"),
    cta: t("banner.cta"),
  };
  const adSlots: Ad[] = Array.from({ length: AD_SLOT_COUNT }, (_, i) =>
    i === 0 ? VIRTUVESPASAULIS_AD : { ...placeholderAd, id: `placeholder-${i + 1}` },
  );

  return (
    <aside
      className={cn(
        "flex shrink-0 flex-col border-b md:border-b-0 md:border-r border-border bg-sidebar transition-[width] duration-150 ease-out",
        collapsed ? "w-full md:w-12" : "w-full md:w-[220px]",
      )}
    >
      <div
        className={cn(
          "hidden md:flex h-10 shrink-0 items-center gap-2 border-b border-border",
          collapsed ? "justify-center px-1.5" : "px-2",
        )}
      >
        <button
          type="button"
          onClick={onToggleCollapse}
          title={collapsed ? t("nav.expand") : t("nav.collapse")}
          aria-label={collapsed ? t("nav.expand") : t("nav.collapse")}
          className="flex size-6 shrink-0 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-accent hover:text-text-primary"
        >
          {collapsed ? <PanelLeftOpenIcon className="size-4" /> : <PanelLeftCloseIcon className="size-4" />}
        </button>
        {!collapsed && (
          <>
            <InvokasMark className="size-6 shrink-0" />
            <span className="text-[15px] font-semibold tracking-[-0.02em] text-text-primary">
              invokas
            </span>
          </>
        )}
      </div>

      <nav className="flex md:block min-h-0 flex-1 gap-1 md:space-y-1 overflow-y-auto px-1.5 py-2">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.key;
          return (
            <button
              key={item.key}
              type="button"
              title={item.label}
              aria-current={isActive ? "page" : undefined}
              onClick={() => navigate({ name: item.key } as Page)}
              className={cn(
                "flex w-full items-center gap-2 rounded-md text-sm transition-colors duration-100",
                "h-11 md:h-7 min-w-0 justify-center md:justify-start px-1.5 text-text-secondary hover:bg-accent hover:text-text-primary",
                isActive && "bg-accent text-text-primary",
                collapsed && "md:justify-center md:px-0",
              )}
            >
              <Icon className="size-4 shrink-0" />
              <span className={cn("truncate", collapsed && "md:hidden")}>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {!collapsed && (
        <div className="hidden md:flex shrink-0 flex-col gap-1.5 border-t border-border p-1.5">
          <div className="max-h-[calc(100vh_-_10rem)] space-y-1.5 overflow-y-auto">
            {adSlots.map((ad) => (
              <AdBanner key={ad.id} ad={ad} />
            ))}
          </div>
          <ThemeSwitcher />
        </div>
      )}
    </aside>
  );
}
