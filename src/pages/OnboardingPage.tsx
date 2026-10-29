import { useEffect, useMemo, useState } from "react";
import { useTheme } from "next-themes";
import { useTranslation } from "react-i18next";
import { CheckIcon, ArrowLeftIcon, ArrowRightIcon, LanguagesIcon, Building2Icon, HashIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useAppLanguage } from "@/context/AppLanguageContext";
import { useSettings } from "@/context/SettingsContext";
import { LANGUAGES, type LanguageMeta } from "@/lib/language";
import { formatNumber } from "@/lib/numbering";
import { Switch } from "@/components/ui/switch";
import { BUSINESS_TYPES, requisitesFor } from "@/lib/business-types";

const STEPS = 3;

export function OnboardingPage() {
  const { t } = useTranslation("settings");
  const { t: tc } = useTranslation("common");
  const { language, setLanguage } = useAppLanguage();
  const { save } = useSettings();
  const { setTheme } = useTheme();

  const [step, setStep] = useState(0);
  const [companyName, setCompanyName] = useState("");
  const [businessType, setBusinessType] = useState(BUSINESS_TYPES[0].value);
  const [selfEmploymentId, setSelfEmploymentId] = useState("");
  const [vatPayer, setVatPayer] = useState(false);
  const [vatCode, setVatCode] = useState("");
  const [address, setAddress] = useState("");
  const [taxId, setTaxId] = useState("");
  const [bank, setBank] = useState("");
  const [iban, setIban] = useState("");
  const [contacts, setContacts] = useState("");
  const [mask, setMask] = useState("INV-{YYYY}-{NNNN}");
  const [startNumber, setStartNumber] = useState("1");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTheme("system");
  }, [setTheme]);

  const preview = useMemo(() => {
    const now = new Date();
    const n = Number.parseInt(startNumber, 10);
    return formatNumber(mask, Number.isFinite(n) ? n : 0, {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      day: now.getDate(),
    });
  }, [mask, startNumber]);

  const requisites = requisitesFor(businessType, vatPayer);

  /** Switching the form drops the requisites it does not carry, so nothing stale gets saved. */
  function changeBusinessType(next: string) {
    setBusinessType(next);
    if (!requisitesFor(next, vatPayer).self_employment_id) {
      setSelfEmploymentId("");
    }
  }

  // Nothing is required yet — only the number mask, which the preview needs to build a number.
  const canNext = step !== 2 || mask.trim().length > 0;

  async function finish() {
    setSaving(true);
    await save({
      interface_language: language,
      document_language: language,
      company_name: companyName.trim(),
      business_type: businessType,
      self_employment_id: selfEmploymentId.trim(),
      vat_payer: vatPayer ? 1 : 0,
      vat_code: vatCode.trim(),
      company_address: address.trim(),
      company_tax_id: taxId.trim(),
      company_bank: bank.trim(),
      company_iban: iban.trim(),
      company_contacts: contacts.trim(),
      number_mask: mask.trim(),
      start_number: Number.parseInt(startNumber, 10) || 1,
    });
    setSaving(false);
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background py-6">
      <div className="w-full max-w-md px-6">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold tracking-[-0.02em] text-text-primary">
            {t("onboarding.title")}
          </h1>
          <p className="mt-1 text-sm text-text-muted">{t("onboarding.subtitle")}</p>
        </div>

        {/* Step indicator */}
        <div className="mb-6 flex items-center gap-1">
          {Array.from({ length: STEPS }, (_, i) => (
            <div
              key={i}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors",
                i <= step ? "bg-primary" : "bg-border",
              )}
            />
          ))}
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          {step === 0 && (
            <div className="space-y-3">
              <StepHeader icon={LanguagesIcon} title={t("onboarding.step1.title")} description={t("onboarding.step1.description")} />
              <div className="space-y-1">
                {LANGUAGES.map((l: LanguageMeta) => (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => setLanguage(l.code, { persist: false })}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors",
                      language === l.code
                        ? "border-primary bg-primary/10 text-text-primary"
                        : "border-border text-text-secondary hover:bg-accent",
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-xs font-medium text-text-muted">{l.short}</span>
                      <span>{l.nativeName}</span>
                    </span>
                    {language === l.code && <CheckIcon className="size-4 text-primary" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3">
              <StepHeader icon={Building2Icon} title={t("onboarding.step2.title")} description={t("onboarding.step2.description")} />
              {requisites.company_name && (
                <Field
                  label={t(requisites.company_name.labelKey)}
                  value={companyName}
                  onChange={setCompanyName}
                  placeholder={t(requisites.company_name.placeholderKey)}
                />
              )}
              <div className="space-y-1">
                <Label className="text-xs text-text-secondary">{t("requisites.businessType")}</Label>
                <Select value={businessType} onValueChange={changeBusinessType}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("requisites.businessTypePlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {BUSINESS_TYPES.map((bt) => (
                      <SelectItem key={bt.value} value={bt.value}>{bt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={vatPayer} onCheckedChange={setVatPayer} />
                <Label className="text-xs text-text-secondary">{t("requisites.vatPayer")}</Label>
              </div>
              {requisites.self_employment_id && (
                <div className="space-y-1">
                  <Field
                    label={t(requisites.self_employment_id.labelKey)}
                    value={selfEmploymentId}
                    onChange={setSelfEmploymentId}
                    placeholder={t(requisites.self_employment_id.placeholderKey)}
                  />
                  <p className="text-xs text-text-subtle">{t("requisites.selfEmploymentIdHint")}</p>
                </div>
              )}
              {requisites.company_address && (
                <Field
                  label={t(requisites.company_address.labelKey)}
                  value={address}
                  onChange={setAddress}
                  placeholder={t(requisites.company_address.placeholderKey)}
                />
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {requisites.company_tax_id && (
                  <Field
                    label={t(requisites.company_tax_id.labelKey)}
                    value={taxId}
                    onChange={setTaxId}
                    placeholder={t(requisites.company_tax_id.placeholderKey)}
                  />
                )}
                {requisites.vat_code && (
                  <Field
                    label={t(requisites.vat_code.labelKey)}
                    value={vatCode}
                    onChange={setVatCode}
                    placeholder={t(requisites.vat_code.placeholderKey)}
                  />
                )}
              </div>
              {requisites.company_bank && (
                <Field
                  label={t(requisites.company_bank.labelKey)}
                  value={bank}
                  onChange={setBank}
                  placeholder={t(requisites.company_bank.placeholderKey)}
                />
              )}
              {requisites.company_iban && (
                <Field
                  label={t(requisites.company_iban.labelKey)}
                  value={iban}
                  onChange={setIban}
                  placeholder={t(requisites.company_iban.placeholderKey)}
                />
              )}
              {requisites.company_contacts && (
                <Field
                  label={t(requisites.company_contacts.labelKey)}
                  value={contacts}
                  onChange={setContacts}
                  placeholder={t(requisites.company_contacts.placeholderKey)}
                />
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <StepHeader icon={HashIcon} title={t("onboarding.step3.title")} description={t("onboarding.step3.description")} />
              <Field label={t("numbering.maskLabel")} value={mask} onChange={setMask} placeholder={t("numbering.maskPlaceholder")} />
              <p className="text-xs text-text-subtle">{t("numbering.maskHelp")}</p>
              <Field label={t("numbering.startNumber")} value={startNumber} onChange={setStartNumber} type="number" />
              <div className="rounded-lg border border-border bg-surface-1 px-3 py-2">
                <p className="text-xs text-text-subtle">{t("numbering.previewLabel")}</p>
                <p className="mt-0.5 font-mono text-sm text-text-primary">{preview}</p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0 || saving}
          >
            <ArrowLeftIcon className="size-3.5" />
            {tc("actions.back")}
          </Button>
          {step < STEPS - 1 ? (
            <Button size="sm" onClick={() => setStep((s) => s + 1)} disabled={!canNext}>
              {tc("actions.next")}
              <ArrowRightIcon className="size-3.5" />
            </Button>
          ) : (
            <Button size="sm" onClick={finish} disabled={saving}>
              {t("onboarding.finish")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function StepHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof LanguagesIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 size-4 text-text-muted" />
      <div>
        <p className="text-lg font-medium text-text-primary">{title}</p>
        <p className="text-sm text-text-muted">{description}</p>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-text-secondary">{label}</Label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.currentTarget.value)}
        placeholder={placeholder}
      />
    </div>
  );
}
