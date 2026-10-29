import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckIcon, ChevronsUpDownIcon, SearchIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Client } from "@/lib/db/types";

interface ClientPickerProps {
  clients: Client[];
  value: Client | null;
  onChange: (client: Client | null) => void;
}

export function ClientPicker({ clients, value, onChange }: ClientPickerProps) {
  const { t } = useTranslation("invoices");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(
      (c) => c.name.toLowerCase().includes(q) || c.company.toLowerCase().includes(q),
    );
  }, [clients, query]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="h-8 w-full justify-between font-normal text-text-secondary"
        >
          <span className={cn("truncate", value && "text-text-primary")}>
            {value ? value.name : t("editor.clientPlaceholder")}
          </span>
          <ChevronsUpDownIcon className="size-3.5 text-text-subtle" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[360px] p-0">
        <div className="border-b border-border p-1.5">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-text-subtle" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.currentTarget.value)}
              placeholder={t("editor.clientPlaceholder")}
              className="h-7 pl-7"
              autoFocus
            />
          </div>
        </div>
        <div className="max-h-64 overflow-y-auto p-1">
          {filtered.length === 0 ? (
            <p className="px-2 py-4 text-center text-sm text-text-muted">{t("editor.clientNone")}</p>
          ) : (
            filtered.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  onChange(c);
                  setOpen(false);
                  setQuery("");
                }}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-text-primary">{c.name}</p>
                  {c.company && <p className="truncate text-xs text-text-subtle">{c.company}</p>}
                </div>
                {value?.id === c.id && <CheckIcon className="size-4 text-primary" />}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
