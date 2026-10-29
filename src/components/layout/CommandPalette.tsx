import { useTranslation } from "react-i18next";
import { useTheme } from "next-themes";
import {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
} from "@/components/ui/command";
import {
  FileTextIcon,
  UsersIcon,
  SettingsIcon,
  PlusIcon,
  SunIcon,
  MoonIcon,
  DownloadIcon,
  GlobeIcon,
} from "lucide-react";
import i18n from "@/i18n";
import { useAppLanguage } from "@/context/AppLanguageContext";
import { LANGUAGES } from "@/lib/language";
import type { Navigate } from "@/lib/navigation";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  navigate: Navigate;
}

/** Labels for a key in every supported language — used for cross-language search. */
function allLanguages(ns: string, key: string): string[] {
  return ["lt", "ru", "en"].map((lng) => i18n.getFixedT(lng, ns)(key) as string);
}

export function CommandPalette({ open, onOpenChange, navigate }: CommandPaletteProps) {
  const { t } = useTranslation("common");
  const { language, setLanguage } = useAppLanguage();
  const { theme, setTheme } = useTheme();

  const run = (action: () => void) => {
    action();
    onOpenChange(false);
  };

  const cycleLanguage = () => {
    const idx = LANGUAGES.findIndex((l) => l.code === language);
    const next = LANGUAGES[(idx + 1) % LANGUAGES.length];
    setLanguage(next.code);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <Command>
        <CommandInput placeholder={t("command.placeholder")} />
        <CommandList>
          <CommandEmpty>{t("command.empty")}</CommandEmpty>

          <CommandGroup heading={t("command.groups.actions")}>
          <CommandItem
            value="create-invoice"
            keywords={allLanguages("common", "command.createInvoice")}
            onSelect={() => run(() => navigate({ name: "invoice", invoiceId: null }))}
          >
            <PlusIcon className="size-4" />
            {t("command.createInvoice")}
            <CommandShortcut>Ctrl N</CommandShortcut>
          </CommandItem>
          <CommandItem
            value="create-client"
            keywords={allLanguages("common", "command.createClient")}
            onSelect={() => run(() => navigate({ name: "client", clientId: null }))}
          >
            <UsersIcon className="size-4" />
            {t("command.createClient")}
          </CommandItem>
          <CommandItem
            value="toggle-theme"
            keywords={allLanguages("common", "command.toggleTheme")}
            onSelect={() => run(() => setTheme(theme === "system" ? "light" : theme === "light" ? "dark" : "system"))}
          >
            {theme === "dark" ? <SunIcon className="size-4" /> : <MoonIcon className="size-4" />}
            {t("command.toggleTheme")}
          </CommandItem>
          <CommandItem
            value="switch-language"
            keywords={allLanguages("common", "command.switchLanguage")}
            onSelect={() => run(cycleLanguage)}
          >
            <GlobeIcon className="size-4" />
            {t("command.switchLanguage")}
          </CommandItem>
          <CommandItem
            value="export-pdf"
            keywords={allLanguages("common", "command.exportPdf")}
            onSelect={() => run(() => navigate({ name: "invoice", invoiceId: null }))}
          >
            <DownloadIcon className="size-4" />
            {t("command.exportPdf")}
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading={t("command.groups.navigate")}>
          <CommandItem
            value="go-invoices"
            keywords={allLanguages("common", "command.goInvoices")}
            onSelect={() => run(() => navigate({ name: "invoices" }))}
          >
            <FileTextIcon className="size-4" />
            {t("command.goInvoices")}
          </CommandItem>
          <CommandItem
            value="go-clients"
            keywords={allLanguages("common", "command.goClients")}
            onSelect={() => run(() => navigate({ name: "clients" }))}
          >
            <UsersIcon className="size-4" />
            {t("command.goClients")}
          </CommandItem>
          <CommandItem
            value="go-settings"
            keywords={allLanguages("common", "command.goSettings")}
            onSelect={() => run(() => navigate({ name: "settings" }))}
          >
            <SettingsIcon className="size-4" />
            {t("command.goSettings")}
          </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
