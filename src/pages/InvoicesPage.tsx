import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { FileTextIcon, PlusIcon, SearchIcon, TrashIcon, CheckCircleIcon, FileDownIcon, CopyIcon } from "lucide-react";
import type { ColumnDef, RowSelectionState } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/EmptyState";
import { DataTable } from "@/components/data-table";
import { InvoiceStatusBadge, type DisplayStatus } from "@/components/invoices/InvoiceStatusBadge";
import { listInvoices, deleteInvoice, setInvoiceStatus, duplicateInvoice } from "@/lib/db/invoices";
import type { Invoice } from "@/lib/db/types";
import { effectiveStatus } from "@/lib/invoice-status";
import { summarizeInvoices } from "@/lib/invoice-summary";
import { formatCurrency, formatDate } from "@/lib/format";
import { monthStartIso, todayIso } from "@/lib/date";
import { toCsv, csvBlob } from "@/lib/csv";
import { save, writeFile } from "@/lib/browser-files";
import { useAppLanguage } from "@/context/AppLanguageContext";
import { useSettings } from "@/context/SettingsContext";

import { cn } from "@/lib/utils";

type StatusFilter = "all" | DisplayStatus;
type PeriodFilter = "all" | "month" | "quarter" | "year";

interface InvoicesPageProps {
  onNewInvoice: () => void;
  onOpenInvoice: (id: number) => void;
}

const STATUS_TABS: StatusFilter[] = ["all", "draft", "sent", "overdue", "paid", "cancelled"];

/** How far the period filter reaches back, counted from the current month. */
const MONTHS_BACK: Record<Exclude<PeriodFilter, "all">, number> = {
  month: 0,
  quarter: 3,
  year: 11,
};

export function InvoicesPage({ onNewInvoice, onOpenInvoice }: InvoicesPageProps) {
  const { t } = useTranslation("invoices");
  const { t: tc } = useTranslation("common");
  const { language } = useAppLanguage();
  const { settings } = useSettings();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [period, setPeriod] = useState<PeriodFilter>("all");
  const [selection, setSelection] = useState<RowSelectionState>({});

  const today = todayIso();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listInvoices();
      setInvoices(rows);
    } catch (err) {
      console.warn("invoices load failed", err);
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const withStatus = useMemo(
    () => invoices.map((inv) => ({ inv, status: effectiveStatus(inv.status, inv.due_date, today) })),
    [invoices, today],
  );

  const counts = useMemo(() => {
    const c: Record<StatusFilter, number> = {
      all: withStatus.length,
      draft: 0,
      sent: 0,
      overdue: 0,
      paid: 0,
      cancelled: 0,
    };
    for (const { status } of withStatus) c[status] += 1;
    return c;
  }, [withStatus]);

  const filtered = useMemo(() => {
    let rows = withStatus;
    if (status !== "all") rows = rows.filter((r) => r.status === status);
    if (search.trim()) {
      const s = search.trim().toLowerCase();
      rows = rows.filter(
        (r) =>
          r.inv.number.toLowerCase().includes(s) ||
          r.inv.client_name.toLowerCase().includes(s) ||
          r.inv.client_company.toLowerCase().includes(s),
      );
    }
    if (period !== "all") {
      const cutoffIso = monthStartIso(MONTHS_BACK[period]);
      rows = rows.filter((r) => r.inv.issue_date >= cutoffIso);
    }
    return rows;
  }, [withStatus, status, search, period]);

  // What the filters left on the screen, added up per currency.
  const summary = useMemo(
    () => summarizeInvoices(filtered.map((row) => row.inv), today),
    [filtered, today],
  );

  async function handleMarkPaid() {
    const ids = selectedIds();
    try {
      for (const id of ids) await setInvoiceStatus(id, "paid");
      toast.success(tc("notify.saved"));
      setSelection({});
      void load();
    } catch (err) {
      console.error(err);
      toast.error(tc("errors.generic"));
    }
  }

  async function handleDelete() {
    const ids = selectedIds();
    try {
      for (const id of ids) await deleteInvoice(id);
      toast.success(tc("notify.deleted"));
      setSelection({});
      void load();
    } catch (err) {
      console.error(err);
      toast.error(tc("errors.generic"));
    }
  }

  function selectedIds(): number[] {
    return Object.entries(selection)
      .filter(([, v]) => v)
      .map(([k]) => Number(k));
  }

  /**
   * Repeats an invoice as a new draft and opens it: the copy carries the client
   * and the lines over, so the usual monthly invoice is a number and a date away
   * from being sent.
   */
  async function handleDuplicate(inv: Invoice) {
    if (!settings) {
      toast.error(tc("errors.generic"));
      return;
    }
    try {
      const copyId = await duplicateInvoice(inv.id, settings);
      toast.success(tc("notify.created"));
      onOpenInvoice(copyId);
    } catch (err) {
      console.error(err);
      toast.error(tc("errors.generic"));
    }
  }

  async function handleExportCsv() {
    try {
      const path = await save({
        defaultPath: "invoices.csv",
        filters: [{ name: "CSV", extensions: ["csv"] }],
      });
      if (!path) return;
      const headers = [
        t("list.columns.number"),
        t("list.columns.client"),
        t("list.columns.issueDate"),
        t("list.columns.dueDate"),
        t("list.columns.amount"),
        t("list.columns.status"),
      ];
      const rows = filtered.map((r) => [
        r.inv.number,
        r.inv.client_name || r.inv.client_company,
        r.inv.issue_date,
        r.inv.due_date,
        (r.inv.total_minor / 100).toFixed(2),
        r.status,
      ]);
      const bytes = new Uint8Array(await csvBlob(toCsv(headers, rows)).arrayBuffer());
      await writeFile(path, bytes);
      toast.success(tc("notify.exported"));
    } catch (err) {
      console.error(err);
      toast.error(tc("errors.file"));
    }
  }

  const columns: ColumnDef<Invoice>[] = [
    {
      accessorKey: "number",
      header: t("list.columns.number"),
      cell: ({ row }) => (
        <span className="font-medium text-text-primary tabular-nums">{row.original.number}</span>
      ),
    },
    {
      accessorKey: "client_name",
      header: t("list.columns.client"),
      cell: ({ row }) => (
        <span className="text-text-secondary">
          {row.original.client_name || row.original.client_company || "—"}
        </span>
      ),
    },
    {
      accessorKey: "issue_date",
      header: t("list.columns.issueDate"),
      cell: ({ row }) => (
        <span className="tabular-nums text-text-secondary">
          {formatDate(row.original.issue_date, language).short}
        </span>
      ),
    },
    {
      accessorKey: "due_date",
      header: t("list.columns.dueDate"),
      cell: ({ row }) => (
        <span className="tabular-nums text-text-secondary">
          {formatDate(row.original.due_date, language).short}
        </span>
      ),
    },
    {
      accessorKey: "total_minor",
      header: t("list.columns.amount"),
      cell: ({ row }) => (
        <span className="tabular-nums font-medium text-text-primary">
          {formatCurrency(row.original.total_minor, row.original.currency || "EUR", language)}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: t("list.columns.status"),
      cell: ({ row }) => (
        <InvoiceStatusBadge
          status={effectiveStatus(row.original.status, row.original.due_date, today)}
        />
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <Button
          size="icon-xs"
          variant="ghost"
          className="text-text-subtle hover:text-text-primary"
          aria-label={tc("actions.duplicate")}
          onClick={(e) => {
            e.stopPropagation();
            void handleDuplicate(row.original);
          }}
        >
          <CopyIcon />
        </Button>
      ),
    },
  ];

  const selectedCount = selectedIds().length;

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
              className="h-7 w-full sm:w-60 pl-7"
            />
          </div>
          <Select value={period} onValueChange={(v) => setPeriod(v as PeriodFilter)}>
            <SelectTrigger size="sm" className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("list.filter.periodAll")}</SelectItem>
              <SelectItem value="month">{t("list.filter.periodMonth")}</SelectItem>
              <SelectItem value="quarter">{t("list.filter.periodQuarter")}</SelectItem>
              <SelectItem value="year">{t("list.filter.periodYear")}</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" variant="ghost" className="h-7" onClick={() => void handleExportCsv()}>
            <FileDownIcon className="size-3.5" />
            {tc("actions.exportCsv")}
          </Button>
          <Button size="sm" className="h-7" onClick={onNewInvoice}>
            <PlusIcon className="size-3.5" />
            {tc("actions.create")}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1 border-b border-border px-4 py-1.5">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setStatus(tab)}
            className={cn(
              "flex h-7 items-center gap-1.5 rounded-md px-2.5 text-sm transition-colors",
              status === tab ? "bg-accent text-text-primary" : "text-text-muted hover:text-text-secondary",
            )}
          >
            {t(`list.filter.${tab}`)}
            <span className="text-xs text-text-subtle tabular-nums">{counts[tab]}</span>
          </button>
        ))}
        {summary.length > 0 && (
          <div className="ml-auto flex flex-wrap items-center gap-3 text-sm tabular-nums">
            {summary.map((total) => (
              <span key={total.currency} className="flex flex-wrap items-center gap-1.5">
                <span className="text-text-subtle">{t("list.summary.paid")}</span>
                <span className="text-text-primary">
                  {formatCurrency(total.paid, total.currency, language)}
                </span>
                <span className="text-text-subtle">·</span>
                <span className="text-text-subtle">{t("list.summary.outstanding")}</span>
                <span className="text-text-primary">
                  {formatCurrency(total.outstanding, total.currency, language)}
                </span>
              </span>
            ))}
          </div>
        )}
      </div>

      {selectedCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-border bg-surface-1 px-4 py-1.5">
          <span className="text-sm text-text-secondary">{t("list.bulk.selected", { count: selectedCount })}</span>
          <div className="ml-auto flex items-center gap-1">
            <Button size="sm" variant="ghost" className="h-7" onClick={() => void handleMarkPaid()}>
              <CheckCircleIcon className="size-3.5" />
              {t("list.bulk.markPaid")}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-destructive"
              onClick={() => void handleDelete()}
            >
              <TrashIcon className="size-3.5" />
              {t("list.bulk.delete")}
            </Button>
          </div>
        </div>
      )}

      <div className="min-h-0 min-w-0 flex-1 overflow-auto p-3 sm:p-4">
        {loading ? (
          <div className="space-y-1">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="h-8 animate-pulse rounded-md bg-muted" />
            ))}
          </div>
        ) : invoices.length === 0 ? (
          <EmptyState
            icon={<FileTextIcon className="size-6" />}
            title={t("list.empty.title")}
            description={t("list.empty.description")}
            actionLabel={t("list.empty.action")}
            onAction={onNewInvoice}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<FileTextIcon className="size-6" />}
            title={t("list.emptySearch.title")}
            description={t("list.emptySearch.description")}
          />
        ) : (
          <DataTable
            columns={columns}
            data={filtered.map((r) => r.inv)}
            enableSelection
            rowSelection={selection}
            onRowSelectionChange={setSelection}
            onRowClick={(inv) => onOpenInvoice(inv.id)}
            getRowId={(inv) => String(inv.id)}
          />
        )}
      </div>
    </div>
  );
}
