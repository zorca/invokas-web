import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ArrowLeftIcon, DownloadIcon, PlusIcon, PrinterIcon, Trash2Icon } from "lucide-react";
import type { AppLanguage } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ClientPicker } from "@/components/invoices/ClientPicker";
import { InvoicePreview } from "@/components/invoices/InvoicePreview";
import { useSettings } from "@/context/SettingsContext";
import { useAppLanguage } from "@/context/AppLanguageContext";
import { listClients } from "@/lib/db/clients";
import {
  getInvoice,
  getInvoiceItems,
  saveInvoice,
  type InvoiceInput,
  type ItemInput,
} from "@/lib/db/invoices";
import { allocateNumber } from "@/lib/db/sequences";
import { addDays, todayIso } from "@/lib/date";
import type { Client, InvoiceItem, InvoiceStatus } from "@/lib/db/types";
import {
  discountMinorFromBp,
  eurosToMinor,
  lineTotalMinor,
  percentToBp,
  quantityToMilli,
} from "@/lib/money";
import { formatCurrency, parseDecimal } from "@/lib/format";
import { exportInvoicePdf } from "@/lib/pdf/pdfService";
import { readLogoDataUrl } from "@/lib/logo";
import { LANGUAGES } from "@/lib/language";
import { dateParts } from "@/lib/numbering";
import type { InvoiceDocumentData } from "@/lib/pdf/types";
import type { Navigate } from "@/lib/navigation";

interface InvoiceEditorPageProps {
  invoiceId: number | null;
  navigate: Navigate;
}

interface EditorItem {
  key: string;
  description: string;
  unit: string;
  quantity: string;
  unitPrice: string;
  discount: string;
}

let itemKey = 0;
function newItem(): EditorItem {
  return { key: `item-${itemKey++}`, description: "", unit: "", quantity: "1", unitPrice: "", discount: "" };
}

function itemFromDb(it: InvoiceItem): EditorItem {
  return {
    key: `item-${it.id}`,
    description: it.description,
    unit: it.unit,
    quantity: (it.quantity_milli / 1000).toString(),
    unitPrice: (it.unit_price_minor / 100).toString(),
    discount: it.discount_bp > 0 ? (it.discount_bp / 100).toString() : "",
  };
}

export function InvoiceEditorPage({ invoiceId, navigate }: InvoiceEditorPageProps) {
  const { t } = useTranslation("invoices");
  const { t: tc } = useTranslation("common");
  const { language } = useAppLanguage();
  const { settings } = useSettings();

  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);

  const [number, setNumber] = useState("");
  const [sequenceKey, setSequenceKey] = useState("");
  const [status, setStatus] = useState<InvoiceStatus>("draft");
  const [issueDate, setIssueDate] = useState(todayIso());
  const [dueDate, setDueDate] = useState(() => addDays(todayIso(), 14));
  const [documentLanguage, setDocumentLanguage] = useState<AppLanguage>("lt");
  const [currency, setCurrency] = useState("EUR");
  const [client, setClient] = useState<Client | null>(null);
  const [discountPercent, setDiscountPercent] = useState("");
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [items, setItems] = useState<EditorItem[]>([newItem()]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);

      // Settings defaults — independent of clients/invoice loading.
      if (settings) {
        setDueDate(addDays(todayIso(), settings.due_days));
        setDocumentLanguage(settings.document_language);
        setCurrency(settings.currency);
        if (settings.default_discount_bp > 0) {
          setDiscountPercent(String(settings.default_discount_bp / 100));
        }
        setTerms(settings.terms);
      }

      // Clients (may fail under plain `vite dev` without Tauri).
      try {
        const loadedClients = await listClients();
        setClients(loadedClients.filter((c) => !c.archived_at));
      } catch (err) {
        console.warn("clients load failed", err);
      }

      // Existing invoice.
      if (invoiceId) {
        try {
          const inv = await getInvoice(invoiceId);
          if (inv) {
            setNumber(inv.number);
            setSequenceKey(inv.sequence_key);
            setStatus(inv.status);
            setIssueDate(inv.issue_date);
            setDueDate(inv.due_date);
            setDocumentLanguage(inv.document_language);
            setCurrency(inv.currency);
            if (inv.subtotal_minor > 0) {
              setDiscountPercent(String((inv.discount_minor / inv.subtotal_minor) * 100));
            }
            setNotes(inv.notes);
            setTerms(inv.terms);
            const allClients = await listClients({ includeArchived: true });
            setClient(allClients.find((x) => x.id === inv.client_id) ?? null);
            const dbItems = await getInvoiceItems(invoiceId);
            setItems(dbItems.length > 0 ? dbItems.map(itemFromDb) : [newItem()]);
          }
        } catch (err) {
          console.error(err);
          toast.error(tc("errors.database"));
        }
      }

      setLoading(false);
    })();
  }, [invoiceId, settings, tc]);

  const logoPath = settings?.logo_path ?? "";

  // The stored value is a path to a file next to the database; both the on-screen preview and the
  // PDF draw the bytes, so the logo is loaded once per settings change and passed as a data URL.
  useEffect(() => {
    let cancelled = false;
    if (!logoPath) {
      setLogoUrl(null);
      return;
    }
    readLogoDataUrl(logoPath)
      .then((url) => {
        if (!cancelled) setLogoUrl(url);
      })
      .catch((err) => {
        console.warn("logo load failed", err);
        if (!cancelled) setLogoUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [logoPath]);

  const parsedItems = useMemo(
    () =>
      items.map((item) => {
        const quantityMilli = quantityToMilli(parseDecimal(item.quantity));
        const unitPriceMinor = eurosToMinor(parseDecimal(item.unitPrice));
        const discountBp = percentToBp(parseDecimal(item.discount));
        return {
          description: item.description,
          unit: item.unit,
          quantity_milli: quantityMilli,
          unit_price_minor: unitPriceMinor,
          discount_bp: discountBp,
          line_total_minor: lineTotalMinor(quantityMilli, unitPriceMinor, discountBp),
        };
      }),
    [items],
  );

  const totals = useMemo(() => {
    const subtotal = parsedItems.reduce((s, it) => s + it.line_total_minor, 0);
    const discount = discountMinorFromBp(subtotal, percentToBp(parseDecimal(discountPercent)));
    return { subtotal, discount, total: subtotal - discount };
  }, [parsedItems, discountPercent]);

  function updateItem(key: string, patch: Partial<EditorItem>) {
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)));
  }

  function removeItem(key: string) {
    setItems((prev) => (prev.length > 1 ? prev.filter((it) => it.key !== key) : prev));
  }

  function addItem() {
    setItems((prev) => [...prev, newItem()]);
  }

  function onItemKeyDown(e: React.KeyboardEvent, index: number) {
    if (e.key === "Enter" && index === items.length - 1) {
      e.preventDefault();
      addItem();
    }
  }

  function handleClientSelect(c: Client | null) {
    setClient(c);
    if (c) {
      setDocumentLanguage(c.document_language);
      setCurrency(c.currency || settings?.currency || "EUR");
    }
  }

  async function save(nextStatus: InvoiceStatus) {
    setSaving(true);
    try {
      let finalNumber = number;
      let finalSequenceKey = sequenceKey;
      if (!finalNumber && settings) {
        const alloc = await allocateNumber(
          settings.number_mask,
          settings.start_number,
          dateParts(issueDate),
        );
        finalNumber = alloc.number;
        finalSequenceKey = alloc.sequenceKey;
      }

      const itemInputs: ItemInput[] = parsedItems.map((it, i) => ({
        position: i,
        description: it.description,
        unit: it.unit,
        quantity_milli: it.quantity_milli,
        unit_price_minor: it.unit_price_minor,
        discount_bp: it.discount_bp,
        line_total_minor: it.line_total_minor,
      }));

      const input: InvoiceInput = {
        number: finalNumber,
        sequence_key: finalSequenceKey,
        status: nextStatus,
        issue_date: issueDate,
        due_date: dueDate,
        document_language: documentLanguage,
        client_id: client?.id ?? null,
        client_name: client?.name ?? "",
        client_company: client?.company ?? "",
        client_company_code: client?.company_code ?? "",
        client_personal_code: client?.personal_code ?? "",
        client_self_employment_id: client?.self_employment_id ?? "",
        client_vat_code: client?.vat_code ?? "",
        client_address: client?.address ?? "",
        client_email: client?.email ?? "",
        currency,
        subtotal_minor: totals.subtotal,
        discount_minor: totals.discount,
        total_minor: totals.total,
        notes,
        terms,
      };

      await saveInvoice({ invoice_id: invoiceId ?? null, input, items: itemInputs });
      toast.success(tc("notify.saved"));
      navigate({ name: "invoices" });
    } catch (err) {
      console.error(err);
      toast.error(tc("errors.save"));
    } finally {
      setSaving(false);
    }
  }

  async function handleExport() {
    if (!previewData) return;
    try {
      const ok = await exportInvoicePdf(previewData, number || "invoice");
      if (ok) toast.success(tc("notify.exported"));
    } catch (err) {
      console.error(err);
      toast.error(tc("errors.file"));
    }
  }

  const previewData: InvoiceDocumentData | null = settings
    ? {
        number: number || "—",
        issue_date: issueDate,
        due_date: dueDate,
        document_language: documentLanguage,
        currency,
        status,
        client_name: client?.name ?? "",
        client_company: client?.company ?? "",
        client_company_code: client?.company_code ?? "",
        client_personal_code: client?.personal_code ?? "",
        client_self_employment_id: client?.self_employment_id ?? "",
        client_vat_code: client?.vat_code ?? "",
        client_address: client?.address ?? "",
        client_email: client?.email ?? "",
        items: parsedItems,
        subtotal_minor: totals.subtotal,
        discount_minor: totals.discount,
        total_minor: totals.total,
        notes,
        terms,
        footer: settings.footer,
        company: {
          name: settings.company_name,
          address: settings.company_address,
          tax_id: settings.company_tax_id,
          self_employment_id: settings.self_employment_id,
          vat_payer: settings.vat_payer === 1,
          vat_code: settings.vat_code,
          bank: settings.company_bank,
          iban: settings.company_iban,
          contacts: settings.company_contacts,
          logo: logoUrl,
        },
      }
    : null;

  if (loading) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i} className="h-8 animate-pulse rounded-md bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col lg:h-full">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2">
        <Button variant="ghost" size="icon-sm" aria-label={tc("actions.back")} onClick={() => navigate({ name: "invoices" })}>
          <ArrowLeftIcon className="size-4" />
        </Button>
        <h1 className="text-lg font-semibold tracking-[-0.02em] text-text-primary">
          {number ? t("editor.titleEdit", { number }) : t("editor.titleNew")}
        </h1>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button size="sm" variant="ghost" className="h-7" onClick={() => void handleExport()} disabled={saving}>
            <DownloadIcon className="size-3.5" />
            {tc("actions.exportPdf")}
          </Button>
          <Button size="sm" variant="ghost" className="h-7" onClick={() => window.print()}>
            <PrinterIcon className="size-3.5" />
            {tc("actions.print")}
          </Button>
          {status === "draft" && (
            <Button size="sm" variant="outline" className="h-7" onClick={() => void save("sent")} disabled={saving}>
              {t("editor.markSent")}
            </Button>
          )}
          {(status === "draft" || status === "sent") && (
            <Button size="sm" className="h-7" onClick={() => void save("paid")} disabled={saving}>
              {t("editor.markPaid")}
            </Button>
          )}
          <Button size="sm" variant="outline" className="h-7" onClick={() => void save("draft")} disabled={saving}>
            {t("editor.saveDraft")}
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Form */}
        <div className="flex w-full lg:w-[46%] min-w-0 flex-col lg:overflow-y-auto border-b lg:border-b-0 lg:border-r border-border p-3 sm:p-4">
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-text-secondary">{t("editor.issueDate")}</Label>
                <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.currentTarget.value)} className="h-8" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-text-secondary">{t("editor.dueDate")}</Label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.currentTarget.value)} className="h-8" />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-text-secondary">{t("editor.client")}</Label>
              <ClientPicker clients={clients} value={client} onChange={handleClientSelect} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-text-secondary">{t("editor.documentLanguage")}</Label>
                <Select value={documentLanguage} onValueChange={(v) => setDocumentLanguage(v as AppLanguage)}>
                  <SelectTrigger className="h-8 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((l) => (
                      <SelectItem key={l.code} value={l.code}>{l.nativeName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-text-secondary">{t("editor.currency")}</Label>
                <Input value={currency} onChange={(e) => setCurrency(e.currentTarget.value.toUpperCase())} className="h-8 uppercase" />
              </div>
            </div>

            {/* Items */}
            <div className="space-y-2">
              <Label className="text-xs text-text-secondary">{t("editor.items.title")}</Label>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-text-subtle">
                      <th className="px-2 py-1.5 font-medium">{t("editor.items.columns.description")}</th>
                      <th className="w-16 px-1 py-1.5 text-right font-medium">{t("editor.items.columns.quantity")}</th>
                      <th className="w-14 px-1 py-1.5 font-medium">{t("editor.items.columns.unit")}</th>
                      <th className="w-20 px-1 py-1.5 text-right font-medium">{t("editor.items.columns.unitPrice")}</th>
                      <th className="w-16 px-1 py-1.5 text-right font-medium">{t("editor.items.columns.discount")}</th>
                      <th className="w-24 px-2 py-1.5 text-right font-medium">{t("editor.items.columns.total")}</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, i) => {
                      const parsed = parsedItems[i];
                      return (
                        <tr key={item.key} className="border-b border-border last:border-0">
                          <td className="px-1 py-1">
                            <Input
                              value={item.description}
                              onChange={(e) => updateItem(item.key, { description: e.currentTarget.value })}
                              onKeyDown={(e) => onItemKeyDown(e, i)}
                              placeholder={t("editor.items.descriptionPlaceholder")}
                              className="h-7 border-0 bg-transparent focus-visible:ring-0"
                            />
                          </td>
                          <td className="px-1 py-1">
                            <Input
                              value={item.quantity}
                              onChange={(e) => updateItem(item.key, { quantity: e.currentTarget.value })}
                              onKeyDown={(e) => onItemKeyDown(e, i)}
                              className="h-7 border-0 bg-transparent text-right tabular-nums focus-visible:ring-0"
                            />
                          </td>
                          <td className="px-1 py-1">
                            <Input
                              value={item.unit}
                              onChange={(e) => updateItem(item.key, { unit: e.currentTarget.value })}
                              onKeyDown={(e) => onItemKeyDown(e, i)}
                              className="h-7 border-0 bg-transparent focus-visible:ring-0"
                            />
                          </td>
                          <td className="px-1 py-1">
                            <Input
                              value={item.unitPrice}
                              onChange={(e) => updateItem(item.key, { unitPrice: e.currentTarget.value })}
                              onKeyDown={(e) => onItemKeyDown(e, i)}
                              className="h-7 border-0 bg-transparent text-right tabular-nums focus-visible:ring-0"
                            />
                          </td>
                          <td className="px-1 py-1">
                            <Input
                              value={item.discount}
                              onChange={(e) => updateItem(item.key, { discount: e.currentTarget.value })}
                              onKeyDown={(e) => onItemKeyDown(e, i)}
                              className="h-7 border-0 bg-transparent text-right tabular-nums focus-visible:ring-0"
                            />
                          </td>
                          <td className="px-2 py-1 text-right tabular-nums text-text-secondary">
                            {parsed && formatCurrency(parsed.line_total_minor, currency, language)}
                          </td>
                          <td className="px-1 py-1">
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              className="text-text-subtle hover:text-destructive"
                              onClick={() => removeItem(item.key)}
                            >
                              <Trash2Icon className="size-3.5" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <Button variant="ghost" size="sm" className="h-7" onClick={addItem}>
                <PlusIcon className="size-3.5" />
                {t("editor.items.addLine")}
              </Button>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-text-secondary">{t("editor.discount")} (%)</Label>
              <Input value={discountPercent} onChange={(e) => setDiscountPercent(e.currentTarget.value)} className="h-8 w-32" />
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-text-secondary">{t("editor.notes")}</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.currentTarget.value)} placeholder={t("editor.notesPlaceholder")} className="min-h-16" />
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-text-secondary">{t("editor.terms")}</Label>
              <Textarea value={terms} onChange={(e) => setTerms(e.currentTarget.value)} placeholder={t("editor.termsPlaceholder")} className="min-h-16" />
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="invoice-preview-pane min-w-0 shrink-0 lg:flex-1 overflow-auto">
          {previewData && <InvoicePreview data={previewData} />}
        </div>
      </div>
    </div>
  );
}
