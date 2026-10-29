import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { loadSettings, saveSettings, defaultSettings } from "./settingsStore";
import { getSettings } from "./db/settings";

beforeEach(() => {
  const data = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value); },
    removeItem: (key: string) => { data.delete(key); },
    key: (index: number) => [...data.keys()][index] ?? null,
    get length() { return data.size; },
  });
});
afterEach(() => vi.unstubAllGlobals());

it("uses the database settings in a plain browser, without a separate demo mirror", async () => {
  expect(await loadSettings()).toBeNull();
  expect(await saveSettings({ company_name: "Real business" })).toEqual({ ...defaultSettings(), company_name: "Real business" });
  expect(await getSettings()).toEqual(await loadSettings());
  expect(localStorage.length).toBe(1);
  expect(localStorage.getItem("invokas:settings")).toBeNull();
});

it("surfaces inaccessible storage rather than returning fake defaults", async () => {
  vi.stubGlobal("localStorage", { getItem() { throw new Error("Storage blocked"); } });
  await expect(loadSettings()).rejects.toThrow("Storage blocked");
});
