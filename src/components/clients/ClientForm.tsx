import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Client } from "@/lib/db/types";
import type { ClientInput } from "@/lib/db/clients";
import {
  CLIENT_TYPES,
  CLIENT_TYPE_LABEL_KEYS,
  DEFAULT_CLIENT_TYPE,
  typeFieldsToClear,
  type ClientType,
  type ClientTypeField,
} from "@/lib/client-types";
import { LANGUAGES } from "@/lib/language";
import { SUPPORTED_LANGUAGES } from "@/i18n";

interface ClientFormProps {
  client?: Client | null;
  onSubmit: (input: ClientInput) => void;
}

/**
 * The id the page's Save button submits through: the button lives in the page header, outside this
 * form, so it needs `form={CLIENT_FORM_ID}` to reach the form's own validation and submit handler.
 */
export const CLIENT_FORM_ID = "client-form";

export function ClientForm({ client, onSubmit }: ClientFormProps) {
  const { t } = useTranslation("clients");
  const { t: tc } = useTranslation("common");

  const schema = useMemo(
    () =>
      z.object({
        name: z.string().trim().min(1, tc("errors.required")),
        company: z.string().trim().optional(),
        client_type: z.enum(CLIENT_TYPES),
        company_code: z.string().trim().optional(),
        personal_code: z.string().trim().optional(),
        self_employment_id: z.string().trim().optional(),
        vat_code: z.string().trim().optional(),
        email: z
          .string()
          .trim()
          .refine((v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), {
            message: tc("errors.required"),
          })
          .optional(),
        phone: z.string().trim().optional(),
        address: z.string().trim().optional(),
        country: z.string().trim().optional(),
        currency: z.string().trim().optional(),
        document_language: z.enum(SUPPORTED_LANGUAGES),
        notes: z.string().optional(),
      }),
    [tc],
  );

  type ClientFormValues = z.infer<typeof schema>;

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: client?.name ?? "",
      company: client?.company ?? "",
      client_type: client?.client_type ?? DEFAULT_CLIENT_TYPE,
      company_code: client?.company_code ?? "",
      personal_code: client?.personal_code ?? "",
      self_employment_id: client?.self_employment_id ?? "",
      vat_code: client?.vat_code ?? "",
      email: client?.email ?? "",
      phone: client?.phone ?? "",
      address: client?.address ?? "",
      country: client?.country ?? "",
      currency: client?.currency ?? "EUR",
      document_language: client?.document_language ?? "lt",
      notes: client?.notes ?? "",
    },
  });

  const clientType = form.watch("client_type");

  /** Switching the type drops the fields of the type being left behind, so an emptied input cannot
   *  leave a value behind that the form no longer shows. */
  function changeClientType(next: ClientType) {
    for (const name of typeFieldsToClear(next)) form.setValue(name, "");
  }

  function handleSubmit(values: ClientFormValues) {
    // The type decides which fields apply, so the ones it is not asked about are dropped here as
    // well as on the switch: a client stored before the type existed can carry both sets.
    const dropped = new Set<string>(typeFieldsToClear(values.client_type));
    const keep = (field: ClientTypeField) => (dropped.has(field) ? "" : values[field] ?? "");

    onSubmit({
      name: values.name,
      company: keep("company"),
      client_type: values.client_type,
      company_code: keep("company_code"),
      personal_code: keep("personal_code"),
      self_employment_id: keep("self_employment_id"),
      vat_code: values.vat_code ?? "",
      email: values.email ?? "",
      phone: values.phone ?? "",
      address: values.address ?? "",
      country: values.country ?? "",
      currency: values.currency ?? "EUR",
      document_language: values.document_language,
      notes: values.notes ?? "",
    });
  }

  return (
    <Form {...form}>
      <form id={CLIENT_FORM_ID} onSubmit={form.handleSubmit(handleSubmit)}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("form.name")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("form.namePlaceholder")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="client_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("form.clientType")}</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(next) => {
                      field.onChange(next);
                      changeClientType(next as ClientType);
                    }}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CLIENT_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {t(CLIENT_TYPE_LABEL_KEYS[type])}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          {/* One row per group: a legal entity is asked for its name and its company number, a
              natural person for their two identity codes, and the VAT code applies to either. */}
          <div className="grid grid-cols-3 gap-3">
            {clientType === "person" ? (
              <>
                <FormField
                  control={form.control}
                  name="personal_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("form.personalCode")}</FormLabel>
                      <FormControl>
                        <Input placeholder={t("form.personalCodePlaceholder")} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="self_employment_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("form.selfEmploymentId")}</FormLabel>
                      <FormControl>
                        <Input placeholder={t("form.selfEmploymentIdPlaceholder")} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            ) : (
              <>
                <FormField
                  control={form.control}
                  name="company"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("form.company")}</FormLabel>
                      <FormControl>
                        <Input placeholder={t("form.companyPlaceholder")} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="company_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("form.companyCode")}</FormLabel>
                      <FormControl>
                        <Input placeholder={t("form.companyCodePlaceholder")} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}
            <FormField
              control={form.control}
              name="vat_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("form.vatCode")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("form.vatCodePlaceholder")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("form.email")}</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder={t("form.emailPlaceholder")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("form.phone")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("form.phonePlaceholder")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="country"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("form.country")}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("form.address")}</FormLabel>
                <FormControl>
                  <Input placeholder={t("form.addressPlaceholder")} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="document_language"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("form.documentLanguage")}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {LANGUAGES.map((l) => (
                        <SelectItem key={l.code} value={l.code}>
                          {l.nativeName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("form.currency")}</FormLabel>
                  <FormControl>
                    <Input className="w-24 uppercase" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("form.notes")}</FormLabel>
                <FormControl>
                  <Textarea placeholder={t("form.notesPlaceholder")} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </form>
    </Form>
  );
}
