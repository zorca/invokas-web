import type { Settings } from "./types";

export function defaultSettings(): Settings {
  return {
    id: 1,
    interface_language: "lt",
    document_language: "lt",
    theme: "dark",
    company_name: "",
    company_address: "",
    company_tax_id: "",
    company_bank: "",
    company_iban: "",
    company_contacts: "",
    logo_path: "",
    currency: "EUR",
    default_discount_bp: 0,
    due_days: 14,
    terms: "",
    footer: "",
    number_mask: "INV-{YYYY}-{NNNN}",
    start_number: 1,

    business_type: "",
    self_employment_id: "",
    vat_payer: 0,
    vat_code: "",
  };
}

