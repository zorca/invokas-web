import { readDatabase, updateDatabase, type DatabaseState } from "./db";
import { now } from "@/lib/date";
import { DEFAULT_CLIENT_TYPE, type ClientType } from "@/lib/client-types";
import type { Client, ClientWithStats, DocumentLanguage } from "./types";
export interface ClientInput {
  name: string;
  company?: string;
  client_type?: ClientType;
  company_code?: string;
  personal_code?: string;
  self_employment_id?: string;
  vat_code?: string;
  email?: string;
  phone?: string;
  address?: string;
  country?: string;
  currency?: string;
  document_language?: DocumentLanguage;
  notes?: string;
}
function stats(state: DatabaseState, client: Client): ClientWithStats {
  const invoices = state.invoices.filter(i => i.client_id === client.id);
  return { ...client, invoice_count: invoices.length, total_minor: invoices.filter(i => i.status !== "cancelled").reduce((sum, i) => sum + i.total_minor, 0) };
}
export async function listClients(opts?: { search?: string; includeArchived?: boolean }): Promise<ClientWithStats[]> {
  const state = readDatabase();
  const search = opts?.search?.toLocaleLowerCase();
  return state.clients.filter(c => (opts?.includeArchived || c.archived_at === null) && (!search || [c.name, c.company, c.company_code, c.personal_code, c.self_employment_id, c.vat_code, c.email].some(value => value.toLocaleLowerCase().includes(search))))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))
    .map(c => stats(state, c));
}
export async function getClientWithStats(id: number): Promise<ClientWithStats | null> {
  const state = readDatabase();
  const client = state.clients.find(c => c.id === id);
  return client ? stats(state, client) : null;
}
const defaults = { name: "", company: "", client_type: DEFAULT_CLIENT_TYPE, company_code: "", personal_code: "", self_employment_id: "", vat_code: "", email: "", phone: "", address: "", country: "", currency: "EUR", document_language: "lt" as DocumentLanguage, notes: "" };
function fields(input: Partial<ClientInput>): Partial<ClientInput> {
  return Object.fromEntries(Object.entries(input).filter(([key, value]) => Object.prototype.hasOwnProperty.call(defaults, key) && value !== undefined));
}
export async function createClient(input: ClientInput): Promise<number> {
  return updateDatabase(state => {
    const id = state.nextIds.client++;
    const ts = now();
    state.clients.push({ ...defaults, ...fields(input), id, created_at: ts, updated_at: ts, archived_at: null });
    return id;
  });
}
export async function updateClient(id: number, patch: Partial<ClientInput>): Promise<void> {
  await updateDatabase(state => {
    const client = state.clients.find(c => c.id === id);
    if (client) Object.assign(client, fields(patch), { updated_at: now() });
  });
}
export async function deleteClient(id: number): Promise<void> {
  await updateDatabase(state => {
    state.clients = state.clients.filter(c => c.id !== id);
    for (const invoice of state.invoices) if (invoice.client_id === id) invoice.client_id = null;
  });
}
export async function setClientArchived(id: number, archived: boolean): Promise<void> {
  await updateDatabase(state => {
    const client = state.clients.find(c => c.id === id);
    if (client) Object.assign(client, { archived_at: archived ? now() : null, updated_at: now() });
  });
}

