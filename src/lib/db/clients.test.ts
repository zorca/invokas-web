import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { createClient, listClients, getClientWithStats, updateClient, deleteClient, setClientArchived } from "./clients";
import { DATABASE_KEY } from "./db";
beforeEach(() => {
 const data = new Map<string, string>();
 vi.stubGlobal("localStorage", { getItem: (k: string) => data.get(k) ?? null, setItem: vi.fn((k: string, v: string) => { data.set(k,v); }) });
});
afterEach(() => vi.unstubAllGlobals());
it("persists client fields, updates, search and archive without native code", async () => {
 const id = await createClient({name: "Beta", personal_code: "123", self_employment_id: "IV1", vat_code: "VAT"});
 expect(await getClientWithStats(id)).toMatchObject({name: "Beta", personal_code: "123", self_employment_id: "IV1", vat_code: "VAT", client_type: "person", invoice_count: 0, total_minor: 0});
 await createClient({name: "alpha", company_code: "987"});
 expect((await listClients()).map(c => c.name)).toEqual(["alpha", "Beta"]);
 expect((await listClients({search: "iv1"})).map(c => c.id)).toEqual([id]);
 await updateClient(id, {name: "Gamma"});
 await setClientArchived(id, true);
 expect(await listClients({search: "Gamma"})).toEqual([]);
 expect(await listClients({includeArchived: true, search: "Gamma"})).toHaveLength(1);
 await setClientArchived(id, false);
 await deleteClient(id);
 expect(await getClientWithStats(id)).toBeNull();
 expect(JSON.parse(localStorage.getItem(DATABASE_KEY)!).clients).toHaveLength(1);
});
it("does not overwrite corrupted data or retain quota-failed writes", async () => {
 localStorage.setItem(DATABASE_KEY, "broken");
 await expect(createClient({name: "unsafe"})).rejects.toThrow();
 expect(localStorage.getItem(DATABASE_KEY)).toBe("broken");
 localStorage.setItem(DATABASE_KEY, JSON.stringify({version: 99}));
 await expect(listClients()).rejects.toThrow();
 vi.stubGlobal("localStorage", {getItem: () => null, setItem() {throw new Error("Quota exceeded");}});
 await expect(createClient({name: "lost"})).rejects.toThrow("Quota exceeded");
 expect(await listClients()).toEqual([]);
});
