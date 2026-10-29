import { effectiveStatus } from "./invoice-status";
import type { Invoice } from "./db/types";

/** What a set of invoices adds up to in one currency. */
export interface CurrencyTotal {
  currency: string;
  /** Sum of the invoices that are already paid. */
  paid: number;
  /** Sum of the invoices that are not paid yet - drafts, sent and overdue ones. */
  outstanding: number;
}

/**
 * Adds up invoices for the list header, per currency.
 *
 * Amounts of different currencies are never added together: the sum of a euro
 * and a dollar is a number with no meaning, so each currency gets its own total.
 * Cancelled invoices are left out of both columns - a cancelled document is
 * neither money collected nor money owed.
 */
export function summarizeInvoices(invoices: Invoice[], today: string): CurrencyTotal[] {
  const byCurrency = new Map<string, CurrencyTotal>();
  for (const invoice of invoices) {
    const status = effectiveStatus(invoice.status, invoice.due_date, today);
    if (status === "cancelled") continue;

    const currency = invoice.currency || "EUR";
    const total = byCurrency.get(currency) ?? { currency, paid: 0, outstanding: 0 };
    if (status === "paid") total.paid += invoice.total_minor;
    else total.outstanding += invoice.total_minor;
    byCurrency.set(currency, total);
  }
  return [...byCurrency.values()];
}
