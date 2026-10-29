import type { AppLanguage } from "@/i18n";
import type { ClientType } from "@/lib/client-types";

export type DocumentLanguage = AppLanguage; // "lt" | "ru" | "uk" | "pl" | "en"
export type InvoiceStatus = "draft" | "sent" | "paid" | "cancelled";
export type Theme = "dark" | "light";

export interface Settings {
  id: number;
  interface_language: DocumentLanguage;
  document_language: DocumentLanguage;
  theme: Theme;
  company_name: string;
  company_address: string;
  company_tax_id: string;
  company_bank: string;
  company_iban: string;
  company_contacts: string;
  logo_path: string;
  currency: string;
  default_discount_bp: number;
  due_days: number;
  terms: string;
  footer: string;
  number_mask: string;
  start_number: number;

  business_type: string;
  /** Self-employment (individuali veikla) certificate number. */
  self_employment_id: string;
  /** 1 when registered as a VAT payer, 0 otherwise. */
  vat_payer: number;
  /** VAT payer code (PVM mokėtojo kodas); printed only while `vat_payer` is 1. */
  vat_code: string;
}

export interface Client {
  id: number;
  name: string;
  company: string;
  client_type: ClientType;
  /** Company number (juridinio asmens kodas) — what a legal entity is identified by. */
  company_code: string;
  /** Asmens kodas — the personal code of a natural person. */
  personal_code: string;
  /** Individuali veikla certificate number of a natural person trading under one. */
  self_employment_id: string;
  /** VAT payer code (PVM mokėtojo kodas), carried by companies and persons alike. */
  vat_code: string;
  email: string;
  phone: string;
  address: string;
  country: string;
  currency: string;
  document_language: DocumentLanguage;
  notes: string;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export interface Invoice {
  id: number;
  number: string;
  sequence_key: string;
  status: InvoiceStatus;
  issue_date: string;
  due_date: string;
  document_language: DocumentLanguage;
  client_id: number | null;
  client_name: string;
  client_company: string;
  client_company_code: string;
  client_personal_code: string;
  client_self_employment_id: string;
  client_vat_code: string;
  client_address: string;
  client_email: string;
  currency: string;
  subtotal_minor: number;
  discount_minor: number;
  total_minor: number;
  notes: string;
  terms: string;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvoiceItem {
  id: number;
  invoice_id: number;
  position: number;
  description: string;
  unit: string;
  quantity_milli: number;
  unit_price_minor: number;
  discount_bp: number;
  line_total_minor: number;
}

export interface ClientWithStats extends Client {
  invoice_count: number;
  total_minor: number;
}
