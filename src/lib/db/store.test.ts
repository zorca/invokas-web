import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { DATABASE_KEY, readDatabase, updateDatabase, validateDatabase } from "./db";
import { createClient, listClients } from "./clients";
import { allocateNumber } from "./sequences";
import { defaultSettings } from "./defaults";

beforeEach(() => {
 const data = new Map<string, string>();
 vi.stubGlobal("localStorage", {getItem: (key: string) => data.get(key) ?? null, setItem: (key: string,value: string) => {data.set(key,value);}});
});
afterEach(() => vi.unstubAllGlobals());
it("uses an exclusive Web Lock for every mutation and rereads after acquiring it", async () => {
 let tail = Promise.resolve();
 const request = vi.fn((_name: string, _options: unknown, callback: () => unknown) => {
   const next = tail.then(callback);
   tail = next.then(() => undefined, () => undefined);
   return next;
 });
 vi.stubGlobal("navigator", {locks: {request}});
 await Promise.all(Array.from({length: 25}, (_, index) => createClient({name: `Client ${index}`})));
 expect(await listClients()).toHaveLength(25);
 expect(request).toHaveBeenCalledTimes(25);
 expect(request).toHaveBeenCalledWith(DATABASE_KEY, {mode: "exclusive"}, expect.any(Function));
});
it("falls back to a synchronous read/modify/write with no lost same-tab updates", async () => {
 vi.stubGlobal("navigator", {});
 await Promise.all(Array.from({length: 25}, (_, index) => createClient({name: `Client ${index}`})));
 expect(await listClients()).toHaveLength(25);
 await expect(updateDatabase(() => {throw new Error("Fail");})).rejects.toThrow("Fail");
 expect(await listClients()).toHaveLength(25);
});
it("rejects unknown fields, invalid versions, unsafe numbers, duplicate IDs and orphan records", async () => {
 const id = await createClient({name: "One"});
 const state = readDatabase();
 expect(() => validateDatabase({...state, version: 2})).toThrow();
 expect(() => validateDatabase({...state, extra: true})).toThrow();
 expect(() => validateDatabase({...state, nextIds: {...state.nextIds, client: id}})).toThrow();
 expect(() => validateDatabase({...state, clients: [...state.clients, ...state.clients]})).toThrow();
 expect(() => validateDatabase({...state, sequences: {key: Number.MAX_SAFE_INTEGER + 1}})).toThrow();
 expect(() => validateDatabase({...state, settings: {...defaultSettings(), theme: "unknown"}})).toThrow();
 expect(() => validateDatabase({...state, items: [{id: 1, invoice_id: 1, position: 0, description: "Orphan", unit: "h", quantity_milli: 1000, unit_price_minor: 100, discount_bp: 0, line_total_minor: 100}], nextIds: {...state.nextIds, item: 2}})).toThrow("orphaned");
});
it("persists a legitimate large data URL logo", async () => {
 const logo = "data:image/png;base64," + "A".repeat(1024 * 1024);
 await updateDatabase(state => {state.settings = {...defaultSettings(), logo_path: logo};});
 expect(readDatabase().settings?.logo_path).toBe(logo);
});
it("rejects an invalid allocation seed even when the period already has a counter", async () => {
 const date = {year: 2026, month: 1, day: 1};
 await allocateNumber("INV-{YYYY}-{NNNN}", 1, date);
 const snapshot = localStorage.getItem(DATABASE_KEY);
 await expect(allocateNumber("INV-{YYYY}-{NNNN}", Number.NaN, date)).rejects.toThrow();
 expect(localStorage.getItem(DATABASE_KEY)).toBe(snapshot);
});
