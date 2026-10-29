import { useCallback, useEffect, useState, type ReactNode } from "react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { TopBar } from "@/components/layout/TopBar";
import { StatusBar } from "@/components/layout/StatusBar";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { invoiceStats } from "@/lib/db/invoices";
import { useSettings } from "@/context/SettingsContext";
import { useAppLanguage } from "@/context/AppLanguageContext";
import type { Navigate, Page } from "@/lib/navigation";

interface AppShellProps {
  page: Page;
  navigate: Navigate;
  children: ReactNode;
}

export function AppShell({ page, navigate, children }: AppShellProps) {
  const { settings } = useSettings();
  const { language } = useAppLanguage();
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem("invokas:sidebar-collapsed") === "1",
  );
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [stats, setStats] = useState<{ count: number; due_total_minor: number } | null>(null);

  const toggleCollapse = useCallback(() => {
    setCollapsed((c) => {
      localStorage.setItem("invokas:sidebar-collapsed", c ? "0" : "1");
      return !c;
    });
  }, []);

  // Global shortcuts: Ctrl/Cmd+K (palette), Ctrl/Cmd+B (sidebar).
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        toggleCollapse();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggleCollapse]);

  // Status-bar stats, refreshed on every page change (e.g. back from the editor).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await invoiceStats();
        if (!cancelled) setStats(s);
      } catch {
        if (!cancelled) setStats(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [page]);

  return (
    <div className="flex h-dvh w-full flex-col md:flex-row overflow-hidden bg-background text-foreground">
      <AppSidebar
        page={page}
        navigate={navigate}
        collapsed={collapsed}
        onToggleCollapse={toggleCollapse}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <TopBar onOpenSearch={() => setPaletteOpen(true)} />
        <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
        <StatusBar
          invoiceCount={stats?.count ?? null}
          dueTotalMinor={stats?.due_total_minor ?? null}
          currency={settings?.currency ?? "EUR"}
          language={language}
        />
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} navigate={navigate} />
    </div>
  );
}
