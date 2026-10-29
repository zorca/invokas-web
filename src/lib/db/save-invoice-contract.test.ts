import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { saveInvoice, getInvoice, getInvoiceItems, listInvoices, deleteInvoice, duplicateInvoice, invoiceStats, setInvoiceStatus, type InvoiceInput } from "./invoices";
import { createClient, deleteClient, getClientWithStats } from "./clients";
import { allocateNumber } from "./sequences";
import { defaultSettings } from "./defaults";
import { DATABASE_KEY } from "./db";
let writes: ReturnType<typeof vi.fn>;
beforeEach(() => {
 const data = new Map<string, string>();
 writes = vi.fn((k: string,v: string) => {data.set(k,v);});
 vi.stubGlobal("localStorage", {getItem: (k: string) => data.get(k) ?? null, setItem: writes});
});
afterEach(() => vi.unstubAllGlobals());
const input: InvoiceInput = {
 number: "INV-1", sequence_key: "2026", status: "draft", issue_date: "2026-01-01", due_date: "2026-01-15", document_language: "lt", client_id: null,
 client_name: "Buyer", client_company: "Company", client_company_code: "CODE", client_personal_code: "PERSON", client_self_employment_id: "IV", client_vat_code: "VAT", client_address: "Address", client_email: "a@example.com", currency: "EUR", subtotal_minor: 1234, discount_minor: 0, total_minor: 1234, notes: "Note", terms: "Terms"
};
const item = {position: 0, description: "Work", unit: "h", quantity_milli: 1000, unit_price_minor: 1234, discount_bp: 0, line_total_minor: 1234};
it("saves and replaces invoice and items in exactly one atomic write", async () => {
 const id = await saveInvoice({invoice_id: null, input, items: [item]});
 expect(writes).toHaveBeenCalledTimes(1);
 expect(await getInvoice(id)).toMatchObject({...input, id, paid_at: null});
 expect(await getInvoiceItems(id)).toMatchObject([{...item, invoice_id: id}]);
 await saveInvoice({invoice_id: id, input: {...input, notes: "Changed"}, items: [{...item, description: "Replacement"}]});
 expect(writes).toHaveBeenCalledTimes(2);
 expect(await getInvoiceItems(id)).toMatchObject([{description: "Replacement"}]);
 const snapshot = localStorage.getItem(DATABASE_KEY);
 await expect(saveInvoice({invoice_id: id, input, items: [{...item, discount_bp: 20000}]})).rejects.toThrow();
 expect(localStorage.getItem(DATABASE_KEY)).toBe(snapshot);
 await expect(saveInvoice({invoice_id: 999, input, items: []})).rejects.toThrow();
 await expect(saveInvoice({invoice_id: null, input, items: []})).rejects.toThrow();
 expect(localStorage.getItem(DATABASE_KEY)).toBe(snapshot);
});
it("tracks status, filters and client statistics, preserving snapshots when a client is deleted", async () => {
 const client = await createClient({name: "Buyer"});
 const id = await saveInvoice({invoice_id: null, input: {...input, client_id: client}, items: [item]});
 await setInvoiceStatus(id, "paid");
 expect((await getInvoice(id))?.paid_at).toEqual(expect.any(String));
 expect(await invoiceStats()).toEqual({count: 1, due_total_minor: 1234});
 expect(await getClientWithStats(client)).toMatchObject({invoice_count: 1, total_minor: 1234});
 expect(await listInvoices({status: "paid", search: "company", from: "2026-01-01", to: "2026-01-01"})).toHaveLength(1);
 expect(await listInvoices({status: "sent"})).toEqual([]);
 expect(await listInvoices({from: "2026-01-02"})).toEqual([]);
 await setInvoiceStatus(id, "cancelled");
 expect((await getInvoice(id))?.paid_at).toBeNull();
 expect(await invoiceStats()).toEqual({count: 0, due_total_minor: 0});
 expect(await getClientWithStats(client)).toMatchObject({invoice_count: 1, total_minor: 0});
 await deleteClient(client);
 expect(await getInvoice(id)).toMatchObject({client_id: null, client_personal_code: "PERSON", client_self_employment_id: "IV", client_vat_code: "VAT"});
 await deleteInvoice(id);
 expect(await getInvoice(id)).toBeNull();
 expect(await getInvoiceItems(id)).toEqual([]);
});
it("duplicates to a fresh draft without changing the source", async () => {
 const id = await saveInvoice({invoice_id: null, input: {...input, status: "paid"}, items: [item]});
 const original = await getInvoice(id);
 const copy = await duplicateInvoice(id, defaultSettings());
 expect(await getInvoice(id)).toEqual(original);
 expect(await getInvoice(copy)).toMatchObject({status: "draft", paid_at: null, client_personal_code: "PERSON", terms: "Terms"});
 expect((await getInvoice(copy))?.number).not.toBe(input.number);
 expect(await getInvoiceItems(copy)).toMatchObject([{...item, invoice_id: copy}]);
});
it("allocates unique numbers under concurrent saves and never reuses a deleted number", async () => {
 const date = {year: 2026, month: 1, day: 1};
 const allocated = await Promise.all(Array.from({length: 20}, () => allocateNumber("INV-{YYYY}-{NNNN}", 10, date)));
 expect(new Set(allocated.map(a => a.number)).size).toBe(20);
 expect(allocated[0].number).toBe("INV-2026-0010");
 expect(allocated[19].number).toBe("INV-2026-0029");
 const id = await saveInvoice({invoice_id: null, input: {...input, number: allocated[0].number}, items: []});
 await deleteInvoice(id);
 expect((await allocateNumber("INV-{YYYY}-{NNNN}", 1, date)).number).toBe("INV-2026-0030");
});

