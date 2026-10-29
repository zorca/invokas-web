import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { open, save as saveDialog } from "@/lib/browser-files";
import { ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSettings } from "@/context/SettingsContext";
import { useAppLanguage } from "@/context/AppLanguageContext";
import { LANGUAGES } from "@/lib/language";
import { formatNumber } from "@/lib/numbering";
import { backupDatabase, deleteDatabase, getDatabasePath, restoreDatabase } from "@/lib/db/backup";
import { Switch } from "@/components/ui/switch";
import { BUSINESS_TYPES, droppedRequisites, requisitesFor } from "@/lib/business-types";
import { LOGO_FILTERS, importLogo, readLogoDataUrl, removeLogo } from "@/lib/logo";
import type { Settings } from "@/lib/db/types";

type Draft = Omit<Settings, "id">;

export function SettingsPage() {
  const { t } = useTranslation("settings");
  const { t: tc } = useTranslation("common");
  const { settings, save } = useSettings();
  const { language, setLanguage } = useAppLanguage();

  const [draft, setDraft] = useState<Draft | null>(null);
  const [dbPath, setDbPath] = useState("");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (settings && !draft) {
      const { id: _id, ...rest } = settings;
      setDraft(rest);
    }
  }, [settings, draft]);

  useEffect(() => {
    getDatabasePath()
      .then(setDbPath)
      .catch(() => setDbPath(""));
  }, []);

  const logoPath = draft?.logo_path ?? "";

  // Resolve the stored browser logo into an image URL.
  useEffect(() => {
    let cancelled = false;
    if (!logoPath) {
      setLogoPreview(null);
      return;
    }
    readLogoDataUrl(logoPath)
      .then((url) => {
        if (!cancelled) setLogoPreview(url);
      })
      .catch((err) => {
        console.warn("logo preview failed", err);
        if (!cancelled) setLogoPreview(null);
      });
    return () => {
      cancelled = true;
    };
  }, [logoPath]);

  const preview = useMemo(() => {
    if (!draft) return "";
    const now = new Date();
    return formatNumber(draft.number_mask, draft.start_number, {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      day: now.getDate(),
    });
  }, [draft]);

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => (d ? { ...d, [key]: value } : d));
  }

  /**
   * Switching the form drops the values of the requisites the new form does not carry: otherwise a
   * number that belongs to the old form (an IV certificate, say) keeps printing on documents of the
   * new one, since the document only checks whether the value is non-empty.
   */
  function changeBusinessType(next: string) {
    setDraft((d) => {
      if (!d) return d;
      const patch: Partial<Draft> = { business_type: next };
      for (const field of droppedRequisites(d.business_type, next)) {
        patch[field] = "";
      }
      return { ...d, ...patch };
    });
  }

  async function handleSave() {
    if (!draft) return;
    setSaving(true);
    try {
      // The interface language is applied and persisted the moment the user changes it; never write
      // it back from this draft, or the stale copy silently reverts the choice on Save.
      const { interface_language: _language, ...patch } = draft;
      await save(patch);
      toast.success(tc("notify.saved"));
    } catch (err) {
      console.error(err);
      toast.error(tc("errors.save"));
    } finally {
      setSaving(false);
    }
  }

  async function handleBackup() {
    const dest = await saveDialog({
      defaultPath: "invokas-backup.json",
      filters: [{ name: "JSON", extensions: ["json"] }],
    });
    if (!dest) return;
    try {
      await backupDatabase(dest);
      toast.success(tc("notify.exported"));
    } catch (err) {
      console.error(err);
      toast.error(tc("errors.file"));
    }
  }

  async function handleRestore() {
    const src = await open({ filters: [{ name: "JSON", extensions: ["json"] }] });
    if (!src) return;
    try {
      await restoreDatabase(src as string);
      toast.success(tc("notify.restored"));
    } catch (err) {
      console.error(err);
      toast.error(tc("errors.file"));
    }
  }

  function handleDeleteDatabase() {
    setDeleteOpen(false);
    setDeleting(true);
    deleteDatabase().catch((err) => {
      console.error(err);
      toast.error(tc("errors.file"));
      setDeleting(false);
    });
  }

  /**
   * Import the selected browser file for preview; persist its reference when settings are saved.
   */
  async function handleChooseLogo() {
    const picked = await open({ multiple: false, directory: false, filters: LOGO_FILTERS });
    if (!picked) return;
    try {
      update("logo_path", await importLogo(picked));
    } catch (err) {
      console.error(err);
      toast.error(tc("errors.file"));
    }
  }

  async function handleRemoveLogo() {
    try {
      await removeLogo();
    } catch (err) {
      console.error(err);
      toast.error(tc("errors.file"));
      return;
    }
    update("logo_path", "");
  }


  if (!draft) {
    return <div className="p-6" />;
  }

  const requisites = requisitesFor(draft.business_type, draft.vat_payer === 1);

  return (
    <div className="mx-auto flex h-full min-w-0 w-full max-w-3xl flex-col">
      <div className="border-b border-border px-3 sm:px-6 py-3">
        <h1 className="text-xl font-semibold tracking-[-0.02em] text-text-primary">{t("title")}</h1>
      </div>

      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto p-3 sm:p-6">
        <Tabs defaultValue="requisites" className="w-full">
          <TabsList className="mb-5 h-auto w-full flex-wrap justify-start gap-1">
            <TabsTrigger value="requisites">{t("tabs.requisites")}</TabsTrigger>
            <TabsTrigger value="numbering">{t("tabs.numbering")}</TabsTrigger>
            <TabsTrigger value="amounts">{t("tabs.amounts")}</TabsTrigger>
            <TabsTrigger value="language">{t("tabs.language")}</TabsTrigger>
            <TabsTrigger value="data">{t("tabs.data")}</TabsTrigger>
          </TabsList>

          <TabsContent value="requisites" className="space-y-4">
            <p className="text-sm text-text-muted">{t("requisites.description")}</p>
            {requisites.company_name && (
              <Field label={t(requisites.company_name.labelKey)}>
                <Input
                  value={draft.company_name}
                  onChange={(e) => update("company_name", e.currentTarget.value)}
                  placeholder={t(requisites.company_name.placeholderKey)}
                />
              </Field>
            )}
            <Field label={t("requisites.logo")}>
              <div className="flex flex-wrap items-center gap-3">
                {logoPreview ? (
                  <img
                    src={logoPreview}
                    alt=""
                    className="h-12 w-12 rounded-md border border-border bg-surface-1 object-contain"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-md border border-dashed border-border text-text-subtle">
                    <ImageIcon className="size-4" />
                  </div>
                )}
                <Button variant="outline" size="sm" className="h-8" onClick={() => void handleChooseLogo()}>
                  {t("requisites.logoChoose")}
                </Button>
                {draft.logo_path && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-destructive"
                    onClick={() => void handleRemoveLogo()}
                  >
                    {t("requisites.logoRemove")}
                  </Button>
                )}
              </div>
              <p className="text-xs text-text-subtle">{t("requisites.logoHint")}</p>
            </Field>
            <Field label={t("requisites.businessType")}>
              <Select value={draft.business_type} onValueChange={changeBusinessType}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("requisites.businessTypePlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {BUSINESS_TYPES.map((bt) => (
                    <SelectItem key={bt.value} value={bt.value}>{bt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label={t("requisites.vatPayer")}>
              <div className="flex items-center gap-2">
                <Switch
                  checked={draft.vat_payer === 1}
                  onCheckedChange={(v) => update("vat_payer", v ? 1 : 0)}
                />
                <span className="text-xs text-text-subtle">{t("requisites.vatPayerHint")}</span>
              </div>
            </Field>
            {requisites.self_employment_id && (
              <Field label={t(requisites.self_employment_id.labelKey)}>
                <Input
                  value={draft.self_employment_id}
                  onChange={(e) => update("self_employment_id", e.currentTarget.value)}
                  placeholder={t(requisites.self_employment_id.placeholderKey)}
                />
                <p className="text-xs text-text-subtle">{t("requisites.selfEmploymentIdHint")}</p>
              </Field>
            )}
            {requisites.company_address && (
              <Field label={t(requisites.company_address.labelKey)}>
                <Input
                  value={draft.company_address}
                  onChange={(e) => update("company_address", e.currentTarget.value)}
                  placeholder={t(requisites.company_address.placeholderKey)}
                />
              </Field>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {requisites.company_tax_id && (
                <Field label={t(requisites.company_tax_id.labelKey)}>
                  <Input
                    value={draft.company_tax_id}
                    onChange={(e) => update("company_tax_id", e.currentTarget.value)}
                    placeholder={t(requisites.company_tax_id.placeholderKey)}
                  />
                </Field>
              )}
              {requisites.vat_code && (
                <Field label={t(requisites.vat_code.labelKey)}>
                  <Input
                    value={draft.vat_code}
                    onChange={(e) => update("vat_code", e.currentTarget.value)}
                    placeholder={t(requisites.vat_code.placeholderKey)}
                  />
                </Field>
              )}
            </div>
            {requisites.company_bank && (
              <Field label={t(requisites.company_bank.labelKey)}>
                <Input
                  value={draft.company_bank}
                  onChange={(e) => update("company_bank", e.currentTarget.value)}
                  placeholder={t(requisites.company_bank.placeholderKey)}
                />
              </Field>
            )}
            {requisites.company_iban && (
              <Field label={t(requisites.company_iban.labelKey)}>
                <Input
                  value={draft.company_iban}
                  onChange={(e) => update("company_iban", e.currentTarget.value)}
                  placeholder={t(requisites.company_iban.placeholderKey)}
                />
              </Field>
            )}
            {requisites.company_contacts && (
              <Field label={t(requisites.company_contacts.labelKey)}>
                <Input
                  value={draft.company_contacts}
                  onChange={(e) => update("company_contacts", e.currentTarget.value)}
                  placeholder={t(requisites.company_contacts.placeholderKey)}
                />
              </Field>
            )}
          </TabsContent>

          <TabsContent value="numbering" className="space-y-4">
            <p className="text-sm text-text-muted">{t("numbering.description")}</p>
            <Field label={t("numbering.maskLabel")}>
              <Input value={draft.number_mask} onChange={(e) => update("number_mask", e.currentTarget.value)} placeholder={t("numbering.maskPlaceholder")} />
            </Field>
            <p className="text-xs text-text-subtle">{t("numbering.maskHelp")}</p>
            <Field label={t("numbering.startNumber")}>
              <Input
                type="number"
                value={String(draft.start_number)}
                onChange={(e) => update("start_number", Number.parseInt(e.currentTarget.value, 10) || 0)}
              />
            </Field>
            <div className="rounded-lg border border-border bg-surface-1 px-3 py-2">
              <p className="text-xs text-text-subtle">{t("numbering.previewLabel")}</p>
              <p className="mt-0.5 font-mono text-sm text-text-primary">{preview || t("numbering.previewEmpty")}</p>
            </div>
          </TabsContent>

          <TabsContent value="amounts" className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field label={t("amounts.currency")}>
                <Input value={draft.currency} onChange={(e) => update("currency", e.currentTarget.value.toUpperCase())} className="uppercase" />
              </Field>
              <Field label={t("amounts.defaultDiscount")}>
                <Input
                  type="number"
                  value={String(draft.default_discount_bp / 100)}
                  onChange={(e) => update("default_discount_bp", Math.round((Number(e.currentTarget.value) || 0) * 100))}
                />
              </Field>
              <Field label={t("amounts.dueDays")}>
                <Input
                  type="number"
                  value={String(draft.due_days)}
                  onChange={(e) => update("due_days", Number.parseInt(e.currentTarget.value, 10) || 0)}
                />
              </Field>
            </div>
            <Field label={t("amounts.terms")}>
              <Textarea value={draft.terms} onChange={(e) => update("terms", e.currentTarget.value)} placeholder={t("amounts.termsPlaceholder")} />
            </Field>
            <Field label={t("amounts.footer")}>
              <Textarea value={draft.footer} onChange={(e) => update("footer", e.currentTarget.value)} placeholder={t("amounts.footerPlaceholder")} />
            </Field>
          </TabsContent>

          <TabsContent value="language" className="space-y-4">
            <Field label={t("language.interfaceLanguage")}>
              <Select value={language} onValueChange={(v) => setLanguage(v as "lt" | "ru" | "en")}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((l) => (
                    <SelectItem key={l.code} value={l.code}>{l.nativeName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label={t("language.defaultDocumentLanguage")}>
              <Select value={draft.document_language} onValueChange={(v) => update("document_language", v as "lt" | "ru" | "en")}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((l) => (
                    <SelectItem key={l.code} value={l.code}>{l.nativeName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <p className="text-xs text-text-subtle">{t("language.documentLanguageHint")}</p>
          </TabsContent>

          <TabsContent value="data" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
              <div>
                <p className="text-sm text-text-primary">{t("data.backup")}</p>
                <p className="text-xs text-text-subtle">{t("data.backupHint")}</p>
              </div>
              <Button variant="outline" size="sm" className="h-8" onClick={() => void handleBackup()}>
                {t("data.backupAction")}
              </Button>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
              <div>
                <p className="text-sm text-text-primary">{t("data.restore")}</p>
                <p className="text-xs text-text-subtle">{t("data.restoreHint")}</p>
              </div>
              <Button variant="outline" size="sm" className="h-8 text-destructive" onClick={() => void handleRestore()}>
                {t("data.restoreAction")}
              </Button>
            </div>

            <Field label={t("data.dbPath")}>
              <div className="flex flex-wrap gap-2">
                <Input value={dbPath} readOnly className="min-w-0 w-full sm:w-auto sm:flex-1 text-text-subtle" />
                <Button variant="outline" size="sm" className="h-8 text-destructive" onClick={() => setDeleteOpen(true)}>
                  {t("data.deleteAction")}
                </Button>
              </div>
            </Field>
          </TabsContent>
        </Tabs>

        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("data.deleteTitle")}</DialogTitle>
              <DialogDescription>{t("data.deleteDescription")}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteOpen(false)}>
                {tc("actions.cancel")}
              </Button>
              <Button variant="destructive" onClick={handleDeleteDatabase} disabled={deleting}>
                {t("data.deleteConfirm")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="mt-6 flex justify-end border-t border-border pt-4">
          <Button size="sm" onClick={() => void handleSave()} disabled={saving}>
            {tc("actions.save")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-text-secondary">{label}</Label>
      {children}
    </div>
  );
}
