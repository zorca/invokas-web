import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import i18n from "@/i18n";
import { formatCurrency, formatDate, formatQuantity } from "@/lib/format";
import { formatAmountInWords } from "./amountWords";
import { registerPdfFonts } from "./fonts";
import type { InvoiceDocumentData } from "./types";

registerPdfFonts();

const MARGIN = 56.69; // 20 mm
const styles = StyleSheet.create({
  page: {
    fontFamily: "Inter",
    fontSize: 9,
    color: "#111111",
    paddingHorizontal: MARGIN,
    paddingTop: 62,
    paddingBottom: MARGIN,
  },
  title: { fontSize: 20, fontWeight: 700, textAlign: "center", textTransform: "uppercase" },
  meta: { marginTop: 10, alignItems: "center", lineHeight: 1.2 },
  parties: { marginTop: 32, flexDirection: "row", gap: 34 },
  party: { flex: 1, lineHeight: 1.2 },
  partyTitle: { fontWeight: 700, marginBottom: 3 },
  logo: { height: 30, width: 110, objectFit: "contain", marginBottom: 5 },
  itemsTable: { marginTop: 30 },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 0.8,
    borderBottomColor: "#111111",
    paddingBottom: 5,
  },
  tableHeaderCell: { fontWeight: 700 },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.8,
    borderBottomColor: "#111111",
    paddingVertical: 6,
  },
  descCell: { width: "40%", paddingRight: 8 },
  qtyCell: { width: "12%", textAlign: "center" },
  unitCell: { width: "12%", textAlign: "center" },
  priceCell: { width: "18%", textAlign: "right" },
  totalCell: { width: "18%", textAlign: "right" },
  totals: { marginTop: 6, alignItems: "flex-end" },
  totalRow: { width: 190, flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  grandTotal: { fontWeight: 700 },
  details: { marginTop: 34, lineHeight: 1.45 },
  signature: { marginTop: 17, flexDirection: "row", alignItems: "flex-end" },
  signatureLine: { marginLeft: 6, width: 225, borderBottomWidth: 0.8, borderBottomColor: "#111111" },
  notes: { marginTop: 18 },
  notesTitle: { fontWeight: 700, marginBottom: 6 },
  secondary: { marginTop: 5 },
});

function PartyDetails({ data, seller }: { data: InvoiceDocumentData; seller: boolean }) {
  const t = i18n.getFixedT(data.document_language, "pdf");
  const c = data.company;
  if (seller) {
    return (
      <View style={styles.party}>
        <Text style={styles.partyTitle}>{t("seller")}</Text>
        {c.logo ? <Image src={c.logo} style={styles.logo} /> : null}
        {c.name ? <Text>{c.name}</Text> : null}
        {c.tax_id ? <Text>{c.tax_id}</Text> : null}
        {c.self_employment_id ? <Text>{`${t("selfEmploymentId")} ${c.self_employment_id}`}</Text> : null}
        {c.vat_payer && c.vat_code ? <Text>{`${t("vatCode")}: ${c.vat_code}`}</Text> : null}
        {c.address ? <Text>{c.address}</Text> : null}
        {c.contacts ? <Text>{c.contacts}</Text> : null}
        {c.bank || c.iban ? <Text>{[c.bank, c.iban].filter(Boolean).join(" — ")}</Text> : null}
      </View>
    );
  }

  return (
    <View style={styles.party}>
      <Text style={styles.partyTitle}>{t("buyer")}</Text>
      {data.client_company ? <Text>{data.client_company}</Text> : null}
      {data.client_name ? <Text>{data.client_name}</Text> : null}
      {data.client_company_code ? (
        <Text>{`${t("companyCode")}: ${data.client_company_code}`}</Text>
      ) : null}
      {data.client_personal_code ? (
        <Text>{`${t("personalCode")}: ${data.client_personal_code}`}</Text>
      ) : null}
      {data.client_self_employment_id ? (
        <Text>{`${t("selfEmploymentId")}: ${data.client_self_employment_id}`}</Text>
      ) : null}
      {data.client_vat_code ? <Text>{`${t("vatCode")}: ${data.client_vat_code}`}</Text> : null}
      {data.client_address ? <Text>{data.client_address}</Text> : null}
      {data.client_email ? <Text>{data.client_email}</Text> : null}
    </View>
  );
}

export function InvoiceDocument({ data }: { data: InvoiceDocumentData }) {
  const t = i18n.getFixedT(data.document_language, "pdf");
  const lang = data.document_language;
  const currency = data.currency || "EUR";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{t("title")}</Text>
        <View style={styles.meta}>
          <Text>{`${t("invoiceNo")} ${data.number}`}</Text>
          <Text>{`${t("issueDate")} ${formatDate(data.issue_date, lang).short}`}</Text>
          <Text>{`${t("dueDate")} ${formatDate(data.due_date, lang).short}`}</Text>
        </View>

        <View style={styles.parties}>
          <PartyDetails data={data} seller />
          <PartyDetails data={data} seller={false} />
        </View>

        <View style={styles.itemsTable}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.descCell]}>{t("description")}</Text>
            <Text style={[styles.tableHeaderCell, styles.qtyCell]}>{t("quantity")}</Text>
            <Text style={[styles.tableHeaderCell, styles.unitCell]}>{t("unit")}</Text>
            <Text style={[styles.tableHeaderCell, styles.priceCell]}>{t("unitPrice")}</Text>
            <Text style={[styles.tableHeaderCell, styles.totalCell]}>{t("lineTotal")}</Text>
          </View>
          {data.items.map((item, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={styles.descCell}>{item.description || "—"}</Text>
              <Text style={styles.qtyCell}>{formatQuantity(item.quantity_milli / 1000, lang)}</Text>
              <Text style={styles.unitCell}>{item.unit}</Text>
              <Text style={styles.priceCell}>{formatCurrency(item.unit_price_minor, currency, lang)}</Text>
              <Text style={styles.totalCell}>{formatCurrency(item.line_total_minor, currency, lang)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totals}>
          {data.discount_minor > 0 ? (
            <>
              <View style={styles.totalRow}>
                <Text>{t("subtotal")}</Text>
                <Text>{formatCurrency(data.subtotal_minor, currency, lang)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text>{t("discount")}</Text>
                <Text>−{formatCurrency(data.discount_minor, currency, lang)}</Text>
              </View>
            </>
          ) : null}
          <View style={[styles.totalRow, styles.grandTotal]}>
            <Text>{t("total")}</Text>
            <Text>{formatCurrency(data.total_minor, currency, lang)}</Text>
          </View>
        </View>

        <View style={styles.details}>
          <Text>{`${t("amountInWords")}: ${formatAmountInWords(data.total_minor, currency, lang)}`}</Text>
          <Text style={styles.secondary}>{`${t("issuedBy")}: ${data.company.name}`}</Text>
          <View style={styles.signature}>
            <Text>{`${t("acceptedBy")}:`}</Text>
            <View style={styles.signatureLine} />
          </View>
        </View>

        {(data.notes || data.terms || data.footer) && (
          <View style={styles.notes}>
            <Text style={styles.notesTitle}>{t("notes")}</Text>
            {data.notes ? <Text>{data.notes}</Text> : null}
            {data.terms ? <Text style={styles.secondary}>{data.terms}</Text> : null}
            {data.footer ? <Text style={styles.secondary}>{data.footer}</Text> : null}
          </View>
        )}
      </Page>
    </Document>
  );
}