/**
 * The type select is what decides which identity fields the form offers: a legal entity is asked
 * for a company number, a natural person for their asmens kodas and IV certificate number. The
 * fields that do not apply must not be in the markup at all — a hidden-but-present input would
 * still submit whatever was typed into it before the type was switched.
 *
 * Rendered ahead of time into markup, so the labels are read from the locale rather than copied
 * here.
 */
import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ltClients from "@/i18n/locales/lt/clients.json";
import "@/i18n";
import { ClientForm } from "./ClientForm";
import type { Client } from "@/lib/db/types";

const CODES = {
  company_code: "123456789",
  personal_code: "38601010000",
  self_employment_id: "IV-123456",
  vat_code: "LT987654321",
};

function client(type: Client["client_type"]): Client {
  return {
    id: 1,
    name: "Klientas",
    company: "",
    client_type: type,
    ...CODES,
    email: "",
    phone: "",
    address: "",
    country: "",
    currency: "EUR",
    document_language: "lt",
    notes: "",
    created_at: "2026-10-09T10:00:00",
    updated_at: "2026-10-09T10:00:00",
    archived_at: null,
  };
}

function render(formClient: Client | null): string {
  return renderToStaticMarkup(
    React.createElement(ClientForm, {
      client: formClient,
      onSubmit: () => {},
    }),
  );
}

/** The label texts overlap ("Įmonė" is a prefix of "Įmonės kodas"), so fields are told apart by the
 *  input's own name, which is what the form binds them by. */
function hasInput(html: string, name: string): boolean {
  return html.includes(`name="${name}"`);
}

describe("client form identity fields", () => {
  it("asks a new client for their two codes, a natural person being the default", () => {
    const html = render(null);
    expect(hasInput(html, "personal_code")).toBe(true);
    expect(hasInput(html, "self_employment_id")).toBe(true);
    expect(html).toContain(ltClients.form.personalCode);
    expect(html).toContain(ltClients.form.selfEmploymentId);
    expect(html).not.toContain(ltClients.form.companyCode);
    expect(hasInput(html, "company")).toBe(false);
    expect(hasInput(html, "company_code")).toBe(false);
    expect(html).toContain(ltClients.form.clientType);
  });

  it("shows a legal entity its own fields and the VAT code", () => {
    const html = render(client("company"));
    expect(html).toContain(ltClients.form.companyCode);
    expect(html).toContain(CODES.company_code);
    expect(hasInput(html, "company")).toBe(true);
    expect(hasInput(html, "personal_code")).toBe(false);
    expect(hasInput(html, "self_employment_id")).toBe(false);
    expect(html).toContain(ltClients.form.vatCode);
    expect(html).toContain(CODES.vat_code);
  });

  it("shows a natural person their two codes instead of a company name and number", () => {
    const html = render(client("person"));
    expect(html).toContain(ltClients.form.personalCode);
    expect(html).toContain(CODES.personal_code);
    expect(html).toContain(ltClients.form.selfEmploymentId);
    expect(html).toContain(CODES.self_employment_id);
    expect(hasInput(html, "company")).toBe(false);
    expect(hasInput(html, "company_code")).toBe(false);
  });

  it("keeps the VAT code for either type, since a natural person can be a VAT payer too", () => {
    for (const type of ["company", "person"] as const) {
      const html = render(client(type));
      expect(html).toContain(ltClients.form.vatCode);
      expect(html).toContain(CODES.vat_code);
    }
  });
});
