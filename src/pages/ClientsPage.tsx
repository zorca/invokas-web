import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { UsersIcon, PlusIcon, SearchIcon } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { EmptyState } from "@/components/EmptyState";
import { DataTable } from "@/components/data-table";
import { listClients } from "@/lib/db/clients";
import type { ClientWithStats } from "@/lib/db/types";
import { clientCode } from "@/lib/client-types";
import { formatCurrency } from "@/lib/format";
import { useAppLanguage } from "@/context/AppLanguageContext";
import { languageMeta } from "@/lib/language";
import type { Navigate } from "@/lib/navigation";

interface ClientsPageProps {
  navigate: Navigate;
}

/**
 * The list itself is read-only: creating and editing a client happens on its own page
 * (`ClientEditorPage`), the way an invoice does, because the requisites outgrew the side panel.
 */
export function ClientsPage({ navigate }: ClientsPageProps) {
  const { t } = useTranslation("clients");
  const { t: tc } = useTranslation("common");
  const { language } = useAppLanguage();

  const [clients, setClients] = useState<ClientWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listClients({ search: search || undefined, includeArchived: showArchived });
      setClients(rows);
    } catch (err) {
      console.warn("clients load failed", err);
      setClients([]);
    } finally {
      setLoading(false);
    }
  }, [search, showArchived]);

  useEffect(() => {
    const handle = setTimeout(() => void load(), 150);
    return () => clearTimeout(handle);
  }, [load]);

  function openClient(clientId: number | null) {
    navigate({ name: "client", clientId });
  }

  const columns: ColumnDef<ClientWithStats>[] = [
    {
      accessorKey: "name",
      header: t("list.columns.name"),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span className="font-medium text-text-primary">{row.original.name}</span>
          {row.original.archived_at && (
            <Badge variant="secondary" className="text-[10px]">{t("list.showArchived").split(" ")[0]}</Badge>
          )}
        </div>
      ),
    },
    { accessorKey: "company", header: t("list.columns.company"), cell: ({ row }) => row.original.company || "—" },
    {
      accessorFn: (client) => clientCode(client),
      id: "code",
      header: t("list.columns.code"),
      cell: ({ row }) => clientCode(row.original) || "—",
    },
    { accessorKey: "email", header: t("list.columns.email"), cell: ({ row }) => row.original.email || "—" },
    {
      accessorKey: "document_language",
      header: t("list.columns.language"),
      cell: ({ row }) => (
        <Badge variant="outline" className="text-[10px]">
          {languageMeta(row.original.document_language).short}
        </Badge>
      ),
    },
    {
      accessorKey: "invoice_count",
      header: t("list.columns.invoiceCount"),
      cell: ({ row }) => <span className="tabular-nums">{row.original.invoice_count}</span>,
    },
    {
      accessorKey: "total_minor",
      header: t("list.columns.total"),
      cell: ({ row }) => (
        <span className="tabular-nums text-text-secondary">
          {formatCurrency(row.original.total_minor, row.original.currency || "EUR", language)}
        </span>
      ),
    },
  ];

  const hasClients = clients.length > 0;

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-2">
        <h1 className="text-xl font-semibold tracking-[-0.02em] text-text-primary">{t("list.title")}</h1>
        <div className="ml-auto flex w-full flex-wrap items-center gap-2 lg:w-auto">
          <div className="relative w-full sm:w-auto">
            <SearchIcon className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-text-subtle" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
              placeholder={t("list.searchPlaceholder")}
              className="h-7 w-full sm:w-64 pl-7"
            />
          </div>
          <label className="flex items-center gap-2 text-xs text-text-secondary">
            <Switch checked={showArchived} onCheckedChange={setShowArchived} />
            {t("list.showArchived")}
          </label>
          <Button size="sm" className="h-7" onClick={() => openClient(null)}>
            <PlusIcon className="size-3.5" />
            {tc("actions.create")}
          </Button>
        </div>
      </div>

      <div className="min-h-0 min-w-0 flex-1 overflow-auto p-3 sm:p-4">
        {loading ? (
          <div className="space-y-1">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="h-8 animate-pulse rounded-md bg-muted" />
            ))}
          </div>
        ) : hasClients ? (
          <DataTable
            columns={columns}
            data={clients}
            onRowClick={(c) => openClient(c.id)}
            getRowId={(c) => String(c.id)}
          />
        ) : (
          <EmptyState
            icon={<UsersIcon className="size-6" />}
            title={search ? t("list.emptySearch.title") : t("list.empty.title")}
            description={search ? t("list.emptySearch.description") : t("list.empty.description")}
            actionLabel={t("list.empty.action")}
            onAction={() => openClient(null)}
          />
        )}
      </div>
    </div>
  );
}
