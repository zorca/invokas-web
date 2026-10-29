import { describe, expect, it } from "vitest";
import { summarizeInvoices } from "./invoice-summary";
import type { Invoice } from "./db/types";

/**
 * The list header sums whatever the filters left on the screen, and the two
 * columns of that sum are what the user reads as "how much came in and how much
 * is still owed". An overdue invoice counts as owed - it is the one case where
 * forgetting the money is most expensive - while a cancelled one counts as
 * neither, or the totals would grow with documents that were never billed.
 */
function invoice(patch: Partial<Invoice>): Invoice {
  return {
    id: 1,
    number: "INV-2026-0001",
    sequence_key: "INV-{YYYY}-{NNNN}|2026",
    status: "draft",
    issue_date: "2026-10-01",
    due_date: "2026-10-15",
    document_language: "lt",
    client_id: null,
    client_name: "",
    client_company: "",
    client_company_code: "",
    client_personal_code: "",
    client_self_employment_id: "",
    client_vat_code: "",
    client_address: "",
    client_email: "",
    currency: "EUR",
    subtotal_minor: 0,
    discount_minor: 0,
    total_minor: 0,
    notes: "",
    terms: "",
    paid_at: null,
    created_at: "2026-10-01T10:00:00",
    updated_at: "2026-10-01T10:00:00",
    ...patch,
  };
}

const TODAY = "2026-10-10";

describe("invoice summary", () => {
  it("separates what is paid from what is still owed", () => {
    const totals = summarizeInvoices(
      [
        invoice({ id: 1, status: "paid", total_minor: 50_000 }),
        invoice({ id: 2, status: "sent", total_minor: 30_000 }),
        invoice({ id: 3, status: "draft", total_minor: 20_000 }),
      ],
      TODAY,
    );

    expect(totals).toEqual([{ currency: "EUR", paid: 50_000, outstanding: 50_000 }]);
  });

  it("adds up every invoice of the set, not one per status", () => {
    const totals = summarizeInvoices(
      [
        invoice({ id: 1, status: "paid", total_minor: 10_000 }),
        invoice({ id: 2, status: "paid", total_minor: 20_000 }),
        invoice({ id: 3, status: "sent", total_minor: 5_000 }),
      ],
      TODAY,
    );

    expect(totals).toEqual([{ currency: "EUR", paid: 30_000, outstanding: 5_000 }]);
  });

  it("counts an invoice past its due date as still owed", () => {
    const totals = summarizeInvoices(
      [invoice({ status: "sent", due_date: "2026-10-09", total_minor: 12_345 })],
      TODAY,
    );

    expect(totals).toEqual([{ currency: "EUR", paid: 0, outstanding: 12_345 }]);
  });

  it("leaves cancelled invoices out of both columns", () => {
    const totals = summarizeInvoices(
      [
        invoice({ id: 1, status: "paid", total_minor: 40_000 }),
        invoice({ id: 2, status: "cancelled", total_minor: 99_999 }),
      ],
      TODAY,
    );

    expect(totals).toEqual([{ currency: "EUR", paid: 40_000, outstanding: 0 }]);
  });

  it("has nothing to show when the set holds none but cancelled invoices", () => {
    expect(summarizeInvoices([invoice({ status: "cancelled", total_minor: 1 })], TODAY)).toEqual([]);
    expect(summarizeInvoices([], TODAY)).toEqual([]);
  });

  it("keeps currencies apart instead of adding them up", () => {
    const totals = summarizeInvoices(
      [
        invoice({ id: 1, status: "paid", currency: "EUR", total_minor: 10_000 }),
        invoice({ id: 2, status: "sent", currency: "USD", total_minor: 20_000 }),
        invoice({ id: 3, status: "paid", currency: "USD", total_minor: 5_000 }),
      ],
      TODAY,
    );

    expect(totals).toEqual([
      { currency: "EUR", paid: 10_000, outstanding: 0 },
      { currency: "USD", paid: 5_000, outstanding: 20_000 },
    ]);
  });

  it("reads an invoice without a currency as the euro one", () => {
    const totals = summarizeInvoices(
      [invoice({ status: "sent", currency: "", total_minor: 7_500 })],
      TODAY,
    );

    expect(totals).toEqual([{ currency: "EUR", paid: 0, outstanding: 7_500 }]);
  });
});
