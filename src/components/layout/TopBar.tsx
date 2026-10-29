import { useTranslation } from "react-i18next";
import { SearchIcon, GlobeIcon, CheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAppLanguage } from "@/context/AppLanguageContext";
import { LANGUAGES } from "@/lib/language";
import { ThemeSwitcher } from "./ThemeSwitcher";

interface TopBarProps {
  onOpenSearch: () => void;
}

export function TopBar({ onOpenSearch }: TopBarProps) {
  const { t } = useTranslation("common");
  const { language, setLanguage } = useAppLanguage();

  return (
    <header className="flex min-h-12 md:min-h-10 shrink-0 items-center gap-2 border-b border-border bg-background px-3">
      <button
        type="button"
        onClick={onOpenSearch}
        className="flex h-9 md:h-7 min-w-0 flex-1 items-center gap-2 rounded-md border border-border bg-background px-2 text-sm text-text-muted transition-colors hover:border-border-strong hover:text-text-secondary"
      >
        <SearchIcon className="size-3.5 shrink-0" />
        <span className="truncate">{t("search.placeholder")}</span>
        <kbd className="ml-auto hidden rounded border border-border px-1 text-[11px] text-text-subtle lg:inline">
          Ctrl K
        </kbd>
      </button>

      <div className="w-24 shrink-0 md:hidden"><ThemeSwitcher /></div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 gap-1.5 px-2 text-text-secondary">
            <GlobeIcon className="size-3.5" />
            <span className="text-xs font-medium">{LANGUAGES.find((l) => l.code === language)?.short}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuLabel>{t("language.interface")}</DropdownMenuLabel>
          {LANGUAGES.map((l) => (
            <DropdownMenuItem
              key={l.code}
              onClick={() => setLanguage(l.code)}
              className="justify-between"
            >
              {l.nativeName}
              {language === l.code && <CheckIcon className="size-4 text-primary" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
