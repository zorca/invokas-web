/**
 * Lithuanian business/legal forms and the requisites each one carries.
 * Form names stay in Lithuanian on purpose — they are statutory terms, not UI copy.
 */

/** A settings column that appears in the company requisites block. */
export type RequisiteField =
  | "company_name"
  | "self_employment_id"
  | "company_tax_id"
  | "vat_code"
  | "company_address"
  | "company_bank"
  | "company_iban"
  | "company_contacts";

export interface RequisiteSlot {
  /** i18n key, resolved inside the `settings` namespace. */
  labelKey: string;
  placeholderKey: string;
}

export interface BusinessType {
  value: string;
  /** Statutory Lithuanian name of the form. */
  label: string;
  /** Requisites a document of this form carries, in display order. */
  fields: RequisiteField[];
  /** Per-form wording overrides — a natural person has a name, not a company name. */
  labels: Partial<Record<RequisiteField, Partial<RequisiteSlot>>>;
}

/** Lithuanian self-employment (individuali veikla): the form that carries a certificate number. */
export const SELF_EMPLOYMENT = "individuali_veikla";

const DEFAULT_SLOTS: Record<RequisiteField, RequisiteSlot> = {
  company_name: {
    labelKey: "requisites.companyName",
    placeholderKey: "requisites.companyNamePlaceholder",
  },
  self_employment_id: {
    labelKey: "requisites.selfEmploymentId",
    placeholderKey: "requisites.selfEmploymentIdPlaceholder",
  },
  company_tax_id: {
    labelKey: "requisites.taxId",
    placeholderKey: "requisites.taxIdPlaceholder",
  },
  vat_code: {
    labelKey: "requisites.vatCode",
    placeholderKey: "requisites.vatCodePlaceholder",
  },
  company_address: {
    labelKey: "requisites.address",
    placeholderKey: "requisites.addressPlaceholder",
  },
  company_bank: {
    labelKey: "requisites.bank",
    placeholderKey: "requisites.bankPlaceholder",
  },
  company_iban: {
    labelKey: "requisites.iban",
    placeholderKey: "requisites.ibanPlaceholder",
  },
  company_contacts: {
    labelKey: "requisites.contacts",
    placeholderKey: "requisites.contactsPlaceholder",
  },
};

export const BUSINESS_TYPES: BusinessType[] = [
  {
    value: SELF_EMPLOYMENT,
    label: "Individuali veikla",
    fields: [
      "company_name",
      "self_employment_id",
      "company_tax_id",
      "vat_code",
      "company_address",
      "company_bank",
      "company_iban",
      "company_contacts",
    ],
    labels: {
      company_name: {
        labelKey: "requisites.personName",
        placeholderKey: "requisites.personNamePlaceholder",
      },
      company_tax_id: {
        labelKey: "requisites.personalCode",
        placeholderKey: "requisites.personalCodePlaceholder",
      },
    },
  },
  {
    value: "mazoji_bendrija",
    label: "Mažoji bendrija",
    fields: [
      "company_name",
      "company_tax_id",
      "vat_code",
      "company_address",
      "company_bank",
      "company_iban",
      "company_contacts",
    ],
    labels: {
      company_tax_id: {
        labelKey: "requisites.companyCode",
        placeholderKey: "requisites.companyCodePlaceholder",
      },
    },
  },
];

/** Used while `business_type` is unset (rows created before the column existed): generic wording. */
const UNSPECIFIED: BusinessType = {
  value: "",
  label: "",
  fields: [
    "company_name",
    "company_tax_id",
    "vat_code",
    "company_address",
    "company_bank",
    "company_iban",
    "company_contacts",
  ],
  labels: {},
};

export function businessTypeOf(value: string): BusinessType {
  return BUSINESS_TYPES.find((type) => type.value === value) ?? UNSPECIFIED;
}

/** True when the given business type is self-employment. */
export function isSelfEmployment(value: string): boolean {
  return value === SELF_EMPLOYMENT;
}

export type Requisites = Partial<Record<RequisiteField, RequisiteSlot>>;

/** Requisites a business only has while it is registered as a VAT payer. */
const VAT_ONLY: RequisiteField[] = ["vat_code"];

/**
 * Requisites to render for a form, keyed by settings column. A requisite the form does not carry is
 * absent from the result — that is what makes a type switch (or the VAT toggle) add/remove fields.
 */
export function requisitesFor(businessType: string, vatPayer: boolean): Requisites {
  const type = businessTypeOf(businessType);
  const requisites: Requisites = {};
  for (const field of type.fields) {
    if (!vatPayer && VAT_ONLY.includes(field)) continue;
    requisites[field] = { ...DEFAULT_SLOTS[field], ...type.labels[field] };
  }
  return requisites;
}

/** Requisites the old form carried and the new one does not — their stored values no longer apply. */
export function droppedRequisites(from: string, to: string): RequisiteField[] {
  const next = new Set(businessTypeOf(to).fields);
  return businessTypeOf(from).fields.filter((field) => !next.has(field));
}
