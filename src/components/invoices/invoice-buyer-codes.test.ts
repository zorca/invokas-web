/**
 * The buyer block asks for the identity codes a client actually carries: a company number for a
 * legal entity, a personal code and an IV certificate number for a natural person, a VAT code for
 * either. Only the filled-in ones are printed — an empty line would say something about a buyer
 * the invoice knows nothing about.
 *
 * Labels are read from the locale, so the assertions check the wiring (label + code) instead of a
 * copy of the text.
 */
import { describe, expect, it, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { pdf } from "@react-pdf/renderer";
import ltPdf from "@/i18n/locales/lt/pdf.json";
import { InvoicePreview } from "./InvoicePreview";
import type { InvoiceDocumentData } from "@/lib/pdf/types";

const COMPANY_CODE = "123456789";
const PERSONAL_CODE = "38601010000";
const SELF_EMPLOYMENT_ID = "IV-123456";
const CLIENT_VAT_CODE = "LT987654321";

const ALL_LABELS = [ltPdf.companyCode, ltPdf.personalCode, ltPdf.selfEmploymentId, ltPdf.vatCode];

// The app registers fonts through Vite `?url` imports, which only resolve under Vite
// (in node they become "/src/assets/...", i.e. C:\src\...). Register the same family and
// weights from disk instead, so the PDF path can be exercised outside the bundler.
vi.mock("@/lib/pdf/fonts", async () => {
  const { Font } = await import("@react-pdf/renderer");
  const disk = process.cwd().replace(/\\/g, "/") + "/src/assets/fonts";
  return {
    registerPdfFonts: () =>
      Font.register({
        family: "Inter",
        fonts: [
          { src: `${disk}/Inter-Regular.ttf`, fontWeight: 400 },
          { src: `${disk}/Inter-Medium.ttf`, fontWeight: 500 },
          { src: `${disk}/Inter-SemiBold.ttf`, fontWeight: 600 },
          { src: `${disk}/Inter-Bold.ttf`, fontWeight: 700 },
        ],
      }),
  };
});

const { InvoiceDocument } = await import("@/lib/pdf/document");

type Codes = Pick<
  InvoiceDocumentData,
  "client_company_code" | "client_personal_code" | "client_self_employment_id" | "client_vat_code"
>;

function data(codes: Partial<Codes>): InvoiceDocumentData {
  return {
    number: "INV-2026-0001",
    issue_date: "2026-10-09",
    due_date: "2026-10-23",
    document_language: "lt",
    currency: "EUR",
    status: "draft",
    client_name: "Klientas",
    client_company: "",
    client_company_code: "",
    client_personal_code: "",
    client_self_employment_id: "",
    client_vat_code: "",
    client_address: "",
    client_email: "",
    items: [
      {
        description: "Paslauga",
        unit: "vnt.",
        quantity_milli: 1000,
        unit_price_minor: 10000,
        discount_bp: 0,
        line_total_minor: 10000,
      },
    ],
    subtotal_minor: 10000,
    discount_minor: 0,
    total_minor: 10000,
    notes: "",
    terms: "",
    footer: "",
    company: {
      name: "MB Testas",
      address: "Vilniaus g. 1",
      tax_id: "123456789",
      self_employment_id: "",
      vat_payer: false,
      vat_code: "",
      bank: "Swedbank",
      iban: "LT00 0000",
      contacts: "a@b.lt",
      logo: null,
    },
    ...codes,
  };
}

function renderPreview(codes: Partial<Codes>): string {
  return renderToStaticMarkup(React.createElement(InvoicePreview, { data: data(codes) }));
}

// Exercises the same renderer path the app uses (pdfService writes the result of toBlob());
// `toBuffer()` is typed as a Buffer but actually returns a Node stream in this renderer version.
async function renderPdf(codes: Partial<Codes>): Promise<Uint8Array> {
  const element = React.createElement(InvoiceDocument, {
    data: data(codes),
  }) as unknown as Parameters<typeof pdf>[0];
  return new Uint8Array(await (await pdf(element).toBlob()).arrayBuffer());
}

describe("buyer identity codes", () => {
  it("prints the company number and the VAT code of a legal entity", () => {
    const html = renderPreview({
      client_company_code: COMPANY_CODE,
      client_vat_code: CLIENT_VAT_CODE,
    });
    expect(html).toContain(`${ltPdf.companyCode}: ${COMPANY_CODE}`);
    expect(html).toContain(`${ltPdf.vatCode}: ${CLIENT_VAT_CODE}`);
    expect(html).not.toContain(ltPdf.personalCode);
    expect(html).not.toContain(ltPdf.selfEmploymentId);
  });

  it("prints the personal code and the IV certificate number of a natural person", () => {
    const html = renderPreview({
      client_personal_code: PERSONAL_CODE,
      client_self_employment_id: SELF_EMPLOYMENT_ID,
    });
    expect(html).toContain(`${ltPdf.personalCode}: ${PERSONAL_CODE}`);
    expect(html).toContain(`${ltPdf.selfEmploymentId}: ${SELF_EMPLOYMENT_ID}`);
    expect(html).not.toContain(ltPdf.companyCode);
  });

  it("prints no code line for a client that carries none", () => {
    const html = renderPreview({});
    for (const label of ALL_LABELS) {
      expect(html).not.toContain(label);
    }
  });

  it("puts the codes into the PDF, so the document differs from one without them", async () => {
    const bare = await renderPdf({});
    const coded = await renderPdf({
      client_company_code: COMPANY_CODE,
      client_vat_code: CLIENT_VAT_CODE,
    });
    expect(new TextDecoder().decode(bare.slice(0, 5))).toBe("%PDF-");
    expect(coded.byteLength).toBeGreaterThan(1000);
    expect(coded.byteLength).not.toBe(bare.byteLength);
  });
});
