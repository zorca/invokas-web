import { useTranslation } from "react-i18next";
import { formatCurrency } from "@/lib/format";
import type { AppLanguage } from "@/i18n";

interface StatusBarProps {
  invoiceCount: number | null;
  dueTotalMinor: number | null;
  currency: string;
  language: AppLanguage;
}

export function StatusBar({ invoiceCount, dueTotalMinor, currency, language }: StatusBarProps) {
  const { t } = useTranslation("common");

  return (
    <footer className="flex min-h-6 shrink-0 flex-wrap items-center gap-x-3 justify-between border-t border-border bg-background px-3 text-[11px] text-text-subtle">
      <div className="flex flex-wrap items-center gap-x-3">
        <span>
          {invoiceCount === null
            ? "—"
            : t("statusbar.invoices", { count: invoiceCount })}
        </span>
        <span>
          {dueTotalMinor === null
            ? "—"
            : t("statusbar.dueToCollect", {
                amount: formatCurrency(dueTotalMinor, currency, language),
              })}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-x-3">
        <span className="font-medium text-text-muted">v{__APP_VERSION__}</span>
      </div>
    </footer>
  );
}
