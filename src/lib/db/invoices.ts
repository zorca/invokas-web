import { readDatabase, updateDatabase } from "./db";
import { addDays, now, todayIso } from "@/lib/date";
import { dateParts } from "@/lib/numbering";
import { allocateNumber } from "./sequences";
import type { DocumentLanguage, Invoice, InvoiceItem, InvoiceStatus, Settings } from "./types";
export interface InvoiceInput {
  number: string;
  sequence_key: string;
  status: InvoiceStatus;
  issue_date: string;
  due_date: string;
  document_language: DocumentLanguage;
  client_id: number | null;
  client_name: string;
  client_company: string;
  client_company_code: string;
  client_personal_code: string;
  client_self_employment_id: string;
  client_vat_code: string;
  client_address: string;
  client_email: string;
  currency: string;
  subtotal_minor: number;
  discount_minor: number;
  total_minor: number;
  notes: string;
  terms: string;
}

export interface ItemInput {
  position: number;
  description: string;
  unit: string;
  quantity_milli: number;
  unit_price_minor: number;
  discount_bp: number;
  line_total_minor: number;
}

export interface ListInvoicesOptions {
  status?: InvoiceStatus;
  search?: string;
  from?: string;
  to?: string;
}

export interface SaveInvoicePayload {
  /** `null` inserts a new invoice, an id updates that invoice in place. */
  invoice_id: number | null;
  input: InvoiceInput;
  items: ItemInput[];
}


export async function listInvoices(opts?: ListInvoicesOptions): Promise<Invoice[]> {
  const search = opts?.search?.toLocaleLowerCase();
  return readDatabase().invoices.filter(i => (!opts?.status || i.status === opts.status)
    && (!opts?.from || i.issue_date >= opts.from) && (!opts?.to || i.issue_date <= opts.to)
    && (!search || [i.number, i.client_name, i.client_company].some(value => value.toLocaleLowerCase().includes(search))))
    .sort((a,b) => b.issue_date.localeCompare(a.issue_date) || b.id - a.id);
}
export async function getInvoice(id: number): Promise<Invoice | null> { return readDatabase().invoices.find(i => i.id === id) ?? null; }
export async function getInvoiceItems(invoiceId: number): Promise<InvoiceItem[]> {
  return readDatabase().items.filter(i => i.invoice_id === invoiceId).sort((a,b) => a.position - b.position);
}
export async function saveInvoice(payload: SaveInvoicePayload): Promise<number> {
  return updateDatabase(state => {
    const existing = payload.invoice_id === null ? undefined : state.invoices.find(i => i.id === payload.invoice_id);
    if (payload.invoice_id !== null && !existing) throw new Error(`Invoice ${payload.invoice_id} is not in the database`);
    const id = existing?.id ?? state.nextIds.invoice++;
    const ts = now();
    const invoice: Invoice = { ...payload.input, id, created_at: existing?.created_at ?? ts, updated_at: ts,
      paid_at: payload.input.status === "paid" ? (existing?.paid_at ?? ts) : null };
    state.invoices = state.invoices.filter(i => i.id !== id);
    state.invoices.push(invoice);
    state.items = state.items.filter(i => i.invoice_id !== id);
    state.items.push(...payload.items.map(item => ({...item, id: state.nextIds.item++, invoice_id: id})));
    return id;
  });
}
export async function duplicateInvoice(id: number, settings: Settings): Promise<number> {
  const source = await getInvoice(id);
  if (!source) {
    throw new Error(`duplicateInvoice: invoice ${id} is not in the database`);
  }
  const items = await getInvoiceItems(id);

  const issue_date = todayIso();
  const { number, sequenceKey } = await allocateNumber(
    settings.number_mask,
    settings.start_number,
    dateParts(issue_date),
  );

  return saveInvoice({
    invoice_id: null,
    input: {
      number,
      sequence_key: sequenceKey,
      status: "draft",
      issue_date,
      due_date: addDays(issue_date, settings.due_days),
      document_language: source.document_language,
      client_id: source.client_id,
      client_name: source.client_name,
      client_company: source.client_company,
      client_company_code: source.client_company_code,
      client_personal_code: source.client_personal_code,
      client_self_employment_id: source.client_self_employment_id,
      client_vat_code: source.client_vat_code,
      client_address: source.client_address,
      client_email: source.client_email,
      currency: source.currency,
      subtotal_minor: source.subtotal_minor,
      discount_minor: source.discount_minor,
      total_minor: source.total_minor,
      notes: source.notes,
      terms: source.terms,
    },
    items: items.map((item) => ({
      position: item.position,
      description: item.description,
      unit: item.unit,
      quantity_milli: item.quantity_milli,
      unit_price_minor: item.unit_price_minor,
      discount_bp: item.discount_bp,
      line_total_minor: item.line_total_minor,
    })),
  });
}


export async function setInvoiceStatus(id: number, status: InvoiceStatus): Promise<void> {
  await updateDatabase(state => {
    const invoice = state.invoices.find(i => i.id === id);
    if (invoice) Object.assign(invoice, {status, paid_at: status === "paid" ? now() : null, updated_at: now()});
  });
}
export async function deleteInvoice(id: number): Promise<void> {
  await updateDatabase(state => {
    state.invoices = state.invoices.filter(i => i.id !== id);
    state.items = state.items.filter(i => i.invoice_id !== id);
  });
}
export async function invoiceStats(): Promise<{ count: number; due_total_minor: number }> {
  const invoices = readDatabase().invoices.filter(i => i.status !== "cancelled");
  return {count: invoices.length, due_total_minor: invoices.filter(i => i.status === "sent" || i.status === "paid").reduce((sum,i) => sum + i.total_minor,0)};
}

