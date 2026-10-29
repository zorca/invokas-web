import { useTranslation } from "react-i18next";
import type { InvoiceStatus } from "@/lib/db/types";
import { cn } from "@/lib/utils";

export type DisplayStatus = InvoiceStatus | "overdue";

const DOT: Record<DisplayStatus, string> = {
  draft: "bg-status-draft",
  sent: "bg-status-sent",
  paid: "bg-status-paid",
  overdue: "bg-status-overdue",
  cancelled: "bg-status-cancelled",
};

const TEXT: Record<DisplayStatus, string> = {
  draft: "text-status-draft",
  sent: "text-status-sent",
  paid: "text-status-paid",
  overdue: "text-status-overdue",
  cancelled: "text-status-cancelled",
};

export function InvoiceStatusBadge({ status }: { status: DisplayStatus }) {
  const { t } = useTranslation("common");
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span className={cn("size-1.5 rounded-full", DOT[status])} />
      <span className={cn("text-sm", TEXT[status])}>{t(`status.${status}`)}</span>
    </span>
  );
}
