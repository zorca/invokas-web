import { z } from "zod";
import type { Settings, Client, Invoice, InvoiceItem } from "./types";
export const DATABASE_KEY = "invokas:database:v1";
const text = z.string();
const integer = z.number().int().safe();
const id = integer.positive();
const language = z.enum(["lt", "en", "ru", "pl", "uk"]);
const settingsSchema = z.strictObject({
  id: z.literal(1), interface_language: language, document_language: language,
  theme: z.enum(["dark", "light"]), company_name: text, company_address: text,
  company_tax_id: text, company_bank: text, company_iban: text, company_contacts: text,
  logo_path: text, currency: text, default_discount_bp: integer.min(0).max(10000),
  due_days: integer.nonnegative(), terms: text, footer: text, number_mask: text,
  start_number: integer.nonnegative(), business_type: text, self_employment_id: text,
  vat_payer: z.union([z.literal(0), z.literal(1)]), vat_code: text,
});
const clientSchema = z.strictObject({
  id, name: text, company: text, client_type: z.enum(["person", "company"]),
  company_code: text, personal_code: text, self_employment_id: text, vat_code: text,
  email: text, phone: text, address: text, country: text, currency: text,
  document_language: language, notes: text, created_at: text, updated_at: text,
  archived_at: text.nullable(),
});
const invoiceSchema = z.strictObject({
  id, number: text, sequence_key: text, status: z.enum(["draft", "sent", "paid", "cancelled"]),
  issue_date: text, due_date: text, document_language: language, client_id: id.nullable(),
  client_name: text, client_company: text, client_company_code: text, client_personal_code: text,
  client_self_employment_id: text, client_vat_code: text, client_address: text, client_email: text,
  currency: text, subtotal_minor: integer, discount_minor: integer, total_minor: integer,
  notes: text, terms: text, paid_at: text.nullable(), created_at: text, updated_at: text,
});
const itemSchema = z.strictObject({
  id, invoice_id: id, position: integer.nonnegative(), description: text, unit: text,
  quantity_milli: integer.nonnegative(), unit_price_minor: integer,
  discount_bp: integer.min(0).max(10000), line_total_minor: integer,
});
export interface DatabaseState {
  version: 1;
  settings: Settings | null;
  clients: Client[];
  invoices: Invoice[];
  items: InvoiceItem[];
  sequences: Record<string, number>;
  nextIds: { client: number; invoice: number; item: number };
}
const schema = z.strictObject({
  version: z.literal(1), settings: settingsSchema.nullable(), clients: z.array(clientSchema),
  invoices: z.array(invoiceSchema), items: z.array(itemSchema),
  sequences: z.record(text, integer.nonnegative()),
  nextIds: z.strictObject({ client: id, invoice: id, item: id }),
});
export function validateDatabase(value: unknown): DatabaseState {
  const state = schema.parse(value);
  for (const [rows, next] of [[state.clients, state.nextIds.client], [state.invoices, state.nextIds.invoice], [state.items, state.nextIds.item]] as const) {
    if (new Set(rows.map(row => row.id)).size !== rows.length || rows.some(row => row.id >= next)) throw new Error("Invalid database: duplicate IDs or invalid next ID");
  }
  const clients = new Set(state.clients.map(row => row.id));
  const invoices = new Set(state.invoices.map(row => row.id));
  if (state.invoices.some(row => row.client_id !== null && !clients.has(row.client_id)) || state.items.some(row => !invoices.has(row.invoice_id))) throw new Error("Invalid database: orphaned record");
  if (new Set(state.invoices.map(row => row.number)).size !== state.invoices.length) throw new Error("Invalid database: duplicate invoice number");
  return state;
}
export function readDatabase(): DatabaseState {
  const raw = localStorage.getItem(DATABASE_KEY);
  return raw === null ? { version: 1, settings: null, clients: [], invoices: [], items: [], sequences: {}, nextIds: { client: 1, invoice: 1, item: 1 } } : validateDatabase(JSON.parse(raw));
}
/** No cache: a failed write never becomes visible as a successful in-memory save. */
export async function withDatabaseLock<T>(operation: () => T): Promise<T> {
  return typeof navigator !== "undefined" && navigator.locks
    ? navigator.locks.request(DATABASE_KEY, { mode: "exclusive" }, async () => operation())
    : operation();
}
export async function updateDatabase<T>(update: (state: DatabaseState) => T): Promise<T> {
  return withDatabaseLock(() => {
    const state = readDatabase();
    const result = update(state);
    localStorage.setItem(DATABASE_KEY, JSON.stringify(validateDatabase(state)));
    return result;
  });
}
export async function getDb(): Promise<DatabaseState> { return readDatabase(); }
