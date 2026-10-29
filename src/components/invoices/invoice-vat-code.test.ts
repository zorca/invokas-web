/**
 * The VAT payer code is a requisites field of its own (settings:vat_code): it is printed on the
 * invoice only while the business is registered as a VAT payer, and never for anyone else.
 */
import { describe, expect, it, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { pdf } from "@react-pdf/renderer";
import ltPdf from "@/i18n/locales/lt/pdf.json";
import { InvoicePreview } from "./InvoicePreview";
import type { InvoiceDocumentData } from "@/lib/pdf/types";

const VAT_CODE = "LT123456789";
// Taken from the locale, so the assertion checks the wiring (label + code) and not a copy of the text.
const VAT_LABEL: string = ltPdf.vatCode;

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

function data(vatPayer: boolean): InvoiceDocumentData {
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
      vat_payer: vatPayer,
      vat_code: VAT_CODE,
      bank: "Swedbank",
      iban: "LT00 0000",
      contacts: "a@b.lt",
      logo: null,
    },
  };
}

function renderPreview(vatPayer: boolean): string {
  return renderToStaticMarkup(React.createElement(InvoicePreview, { data: data(vatPayer) }));
}

describe("reference invoice layout", () => {
  it("renders separate seller, buyer, unit, amount-in-words and signature sections", () => {
    const html = renderPreview(true);
    for (const text of [
      "Pardavėjas",
      ltPdf.buyer,
      "Matas",
      "Suma žodžiais",
      "Sąskaitą išrašė",
      "Sąskaitą priėmė",
    ]) {
      expect(html).toContain(text);
    }
  });
});

// Exercises the same renderer path the app uses (pdfService writes the result of toBlob());
// `toBuffer()` is typed as a Buffer but actually returns a Node stream in this renderer version.
async function renderPdf(vatPayer: boolean): Promise<Uint8Array> {
  const element = React.createElement(InvoiceDocument, {
    data: data(vatPayer),
  }) as unknown as Parameters<typeof pdf>[0];
  return new Uint8Array(await (await pdf(element).toBlob()).arrayBuffer());
}

describe("VAT code line", () => {
  it("is printed on the on-screen invoice for a VAT payer", () => {
    expect(renderPreview(true)).toContain(`${VAT_LABEL}: ${VAT_CODE}`);
  });

  it("stays off the invoice when the business is not a VAT payer", () => {
    const html = renderPreview(false);
    expect(html).not.toContain(VAT_CODE);
    expect(html).not.toContain(VAT_LABEL);
  });

  it("produces a well-formed PDF", async () => {
    const bytes = await renderPdf(true);
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
    expect(bytes.byteLength).toBeGreaterThan(1000);
  });

  it("draws the code line, so the VAT-payer PDF differs from the plain one", async () => {
    const withVat = await renderPdf(true);
    const withoutVat = await renderPdf(false);
    expect(withVat.byteLength).not.toBe(withoutVat.byteLength);
  });
});
