import type { InvoiceStatus } from "@/lib/db/types";

/**
 * The displayed status of an invoice. "Overdue" is never stored — it is
 * derived from a `sent` invoice whose due date has passed.
 */
export function effectiveStatus(
  status: InvoiceStatus,
  dueDate: string,
  today: string,
): InvoiceStatus | "overdue" {
  if (status === "sent" && dueDate < today) return "overdue";
  return status;
}

export const STATUS_ORDER: Array<InvoiceStatus | "overdue"> = [
  "draft",
  "sent",
  "overdue",
  "paid",
  "cancelled",
];
