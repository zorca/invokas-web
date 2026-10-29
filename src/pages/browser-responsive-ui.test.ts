import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const source = (file: string) => readFileSync(`${process.cwd()}/src/${file}`, "utf8");

describe("browser settings", () => {
  it("uses browser file picking and JSON backups without desktop-only guards", () => {
    const page = source("pages/SettingsPage.tsx");
    expect(page).toContain('from "@/lib/browser-files"');
    expect(page).not.toContain("isTauri");
    expect(page).not.toContain("@tauri-apps/");
    expect(page).toContain('defaultPath: "invokas-backup.json"');
    expect(page).toContain('extensions: ["json"]');
    expect(page).not.toContain("SQLite");
  });
});

describe("narrow-screen layouts", () => {
  it("stacks the invoice editor and preserves scrollable full-size line inputs and preview", () => {
    const page = source("pages/InvoiceEditorPage.tsx");
    expect(page).toContain("flex-col lg:flex-row");
    expect(page).toContain("min-w-[640px]");
    expect(page).toContain("invoice-preview-pane");
    const css = source("index.css");
    expect(css).toContain(".invoice-preview-pane > div");
    expect(css).toContain(".client-editor form .grid");
  });
  it("wraps the settings tab strip", () => {
    expect(source("pages/SettingsPage.tsx")).toContain('TabsList className="mb-5 h-auto w-full flex-wrap');
  });
});
