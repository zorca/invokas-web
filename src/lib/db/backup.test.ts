import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { backupDatabase, restoreDatabase, deleteAllData, getDatabasePath } from "./backup";
import { updateSettings } from "./settings";
import { readDatabase, DATABASE_KEY } from "./db";
const { writeFile, readPickedFile, reload } = vi.hoisted(() => ({writeFile: vi.fn(), readPickedFile: vi.fn(), reload: vi.fn()}));
vi.mock("@/lib/browser-files", () => ({writeFile, readPickedFile}));
beforeEach(() => {
 const data = new Map<string,string>();
 vi.stubGlobal("localStorage", {getItem: (k: string) => data.get(k) ?? null, setItem: vi.fn((k: string,v: string) => {data.set(k,v);}), removeItem: (k: string) => data.delete(k), key: (i: number) => [...data.keys()][i] ?? null, get length() {return data.size;}});
 vi.stubGlobal("window", {location: {reload}});
 vi.clearAllMocks();
});
afterEach(() => vi.unstubAllGlobals());
it("downloads a versioned JSON backup and restores the validated database", async () => {
 await updateSettings({company_name: "Backup company"});
 expect(await getDatabasePath()).toBe(DATABASE_KEY);
 await backupDatabase("backup.json");
 const [path, bytes] = writeFile.mock.calls[0];
 expect(path).toBe("backup.json");
 expect(bytes).toBeInstanceOf(Uint8Array);
 const contents = new TextDecoder().decode(bytes);
 expect(JSON.parse(contents).version).toBe(1);
 await updateSettings({company_name: "Changed"});
 readPickedFile.mockReturnValue(new File([contents], "backup.json"));
 await restoreDatabase("picked-file");
 expect(readDatabase().settings?.company_name).toBe("Backup company");
 expect(reload).toHaveBeenCalledTimes(1);
});
it("rejects malformed, oversized and structurally invalid backups without overwrite or reload", async () => {
 await updateSettings({company_name: "Keep"});
 const before = localStorage.getItem(DATABASE_KEY);
 for (const data of ["not json", JSON.stringify({...readDatabase(), version: 99}), JSON.stringify({...readDatabase(), clients: [{id: 1}]})]) {
  readPickedFile.mockReturnValue(new File([data], "invalid.json"));
  await expect(restoreDatabase("bad")).rejects.toThrow();
  expect(localStorage.getItem(DATABASE_KEY)).toBe(before);
 }
 const text = vi.fn();
 readPickedFile.mockReturnValue({size: 100 * 1024 * 1024, text});
 await expect(restoreDatabase("huge")).rejects.toThrow();
 expect(text).not.toHaveBeenCalled();
 expect(reload).not.toHaveBeenCalled();
});
it("does not reload after a quota failure and deletes only Invokas-owned keys", async () => {
 await updateSettings({company_name: "Keep"});
 const snapshot = localStorage.getItem(DATABASE_KEY);
 readPickedFile.mockReturnValue(new File([snapshot!], "backup.json"));
 const set = vi.spyOn(localStorage, "setItem").mockImplementationOnce(() => {throw new Error("Quota");});
 await expect(restoreDatabase("picked")).rejects.toThrow("Quota");
 expect(reload).not.toHaveBeenCalled();
 set.mockRestore();
 localStorage.setItem("another-app", "keep");
 localStorage.setItem("invokas:language", "en");
 localStorage.setItem("invokas:theme", "light");
 await deleteAllData();
 expect(localStorage.getItem(DATABASE_KEY)).toBeNull();
 expect(localStorage.getItem("invokas:language")).toBeNull();
 expect(localStorage.getItem("another-app")).toBe("keep");
 expect(reload).toHaveBeenCalledTimes(1);
});
