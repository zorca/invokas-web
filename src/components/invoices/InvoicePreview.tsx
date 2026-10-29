import i18n from "@/i18n";
import { formatCurrency, formatDate, formatQuantity } from "@/lib/format";
import { formatAmountInWords } from "@/lib/pdf/amountWords";
import type { InvoiceDocumentData } from "@/lib/pdf/types";

interface InvoicePreviewProps {
  data: InvoiceDocumentData;
}

export function InvoicePreview({ data }: InvoicePreviewProps) {
  const t = i18n.getFixedT(data.document_language, "pdf");
  const lang = data.document_language;
  const currency = data.currency || "EUR";
  const c = data.company;

  return (
    <div className="flex justify-center overflow-auto bg-background p-6">
      <div className="invoice-sheet aspect-[210/297] w-full max-w-[560px] shrink-0 rounded-md bg-white text-[#111] shadow-[0_12px_32px_rgba(0,0,0,0.5)]">
        <div className="h-full px-10 pb-10 pt-12 text-[10px] leading-[1.45]">
          <h1 className="text-center text-[21px] font-bold uppercase tracking-tight">{t("title")}</h1>
          <div className="mt-2 text-center leading-[1.2]">
            <p>{t("invoiceNo")} {data.number}</p>
            <p>{t("issueDate")} {formatDate(data.issue_date, lang).short}</p>
            <p>{t("dueDate")} {formatDate(data.due_date, lang).short}</p>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-10">
            <div className="leading-[1.2]">
              <p className="mb-1 font-bold">{t("seller")}</p>
              {c.logo && <img src={c.logo} alt="" className="mb-1 h-8 max-w-28 object-contain" />}
              {c.name && <p>{c.name}</p>}
              {c.tax_id && <p>{c.tax_id}</p>}
              {c.self_employment_id && <p>{t("selfEmploymentId")} {c.self_employment_id}</p>}
              {c.vat_payer && c.vat_code && <p>{t("vatCode")}: {c.vat_code}</p>}
              {c.address && <p>{c.address}</p>}
              {c.contacts && <p>{c.contacts}</p>}
              {(c.bank || c.iban) && <p>{[c.bank, c.iban].filter(Boolean).join(" — ")}</p>}
            </div>
            <div className="leading-[1.2]">
              <p className="mb-1 font-bold">{t("buyer")}</p>
              {data.client_company && <p>{data.client_company}</p>}
              {data.client_name && <p>{data.client_name}</p>}
              {data.client_company_code && <p>{t("companyCode")}: {data.client_company_code}</p>}
              {data.client_personal_code && <p>{t("personalCode")}: {data.client_personal_code}</p>}
              {data.client_self_employment_id && <p>{t("selfEmploymentId")}: {data.client_self_employment_id}</p>}
              {data.client_vat_code && <p>{t("vatCode")}: {data.client_vat_code}</p>}
              {data.client_address && <p>{data.client_address}</p>}
              {data.client_email && <p>{data.client_email}</p>}
            </div>
          </div>

          <table className="mt-8 w-full table-fixed text-[10px]">
            <colgroup>
              <col className="w-[40%]" /><col className="w-[12%]" /><col className="w-[12%]" />
              <col className="w-[18%]" /><col className="w-[18%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-black">
                <th className="pb-1 text-left font-bold">{t("description")}</th>
                <th className="pb-1 text-center font-bold">{t("quantity")}</th>
                <th className="pb-1 text-center font-bold">{t("unit")}</th>
                <th className="pb-1 text-right font-bold">{t("unitPrice")}</th>
                <th className="pb-1 text-right font-bold">{t("lineTotal")}</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, index) => (
                <tr key={index} className="border-b border-black">
                  <td className="py-1.5 pr-2">{item.description || "—"}</td>
                  <td className="py-1.5 text-center tabular-nums">{formatQuantity(item.quantity_milli / 1000, lang)}</td>
                  <td className="py-1.5 text-center">{item.unit}</td>
                  <td className="py-1.5 text-right tabular-nums">{formatCurrency(item.unit_price_minor, currency, lang)}</td>
                  <td className="py-1.5 text-right tabular-nums">{formatCurrency(item.line_total_minor, currency, lang)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-1 flex justify-end">
            <div className="w-48 text-[10px]">
              {data.discount_minor > 0 && (
                <>
                  <div className="flex justify-between"><span>{t("subtotal")}</span><span>{formatCurrency(data.subtotal_minor, currency, lang)}</span></div>
                  <div className="flex justify-between"><span>{t("discount")}</span><span>−{formatCurrency(data.discount_minor, currency, lang)}</span></div>
                </>
              )}
              <div className="flex justify-between font-bold"><span>{t("total")}</span><span>{formatCurrency(data.total_minor, currency, lang)}</span></div>
            </div>
          </div>

          <div className="mt-8">
            <p>{t("amountInWords")}: {formatAmountInWords(data.total_minor, currency, lang)}</p>
            <p className="mt-1">{t("issuedBy")}: {c.name}</p>
            <div className="mt-4 flex items-end">
              <span>{t("acceptedBy")}:</span><span className="ml-2 inline-block w-56 border-b border-black" />
            </div>
          </div>

          {(data.notes || data.terms || data.footer) && (
            <div className="mt-5">
              <p className="mb-1 font-bold">{t("notes")}</p>
              {data.notes && <p>{data.notes}</p>}
              {data.terms && <p className="mt-1">{data.terms}</p>}
              {data.footer && <p className="mt-1">{data.footer}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}