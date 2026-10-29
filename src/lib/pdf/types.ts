import type { AppLanguage } from "@/i18n";

export interface InvoiceCompanyData {
  name: string;
  address: string;
  tax_id: string;
  self_employment_id: string;
  /** True when the business is registered as a VAT payer — the VAT code is only printed then. */
  vat_payer: boolean;
  vat_code: string;
  bank: string;
  iban: string;
  contacts: string;
  logo?: string | null;
}

export interface InvoiceDocumentItem {
  description: string;
  unit: string;
  quantity_milli: number;
  unit_price_minor: number;
  discount_bp: number;
  line_total_minor: number;
}

/** Serializable data shared by the on-screen preview and the PDF document. */
export interface InvoiceDocumentData {
  number: string;
  issue_date: string;
  due_date: string;
  document_language: AppLanguage;
  currency: string;
  status: string;
  client_name: string;
  client_company: string;
  /** Buyer identity codes, each printed only while the client actually carries it. */
  client_company_code: string;
  client_personal_code: string;
  client_self_employment_id: string;
  client_vat_code: string;
  client_address: string;
  client_email: string;
  items: InvoiceDocumentItem[];
  subtotal_minor: number;
  discount_minor: number;
  total_minor: number;
  notes: string;
  terms: string;
  footer: string;
  company: InvoiceCompanyData;
}
