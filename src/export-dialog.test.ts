import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(`${process.cwd()}/${path}`, "utf8");

describe("export destinations", () => {
  it("always lets the system save dialog choose the destination", () => {
    const pdf = read("src/lib/pdf/pdfService.ts");
    const invoices = read("src/pages/InvoicesPage.tsx");
    const settings = read("src/pages/SettingsPage.tsx");
    const types = read("src/lib/db/types.ts");

    expect(pdf).toContain('defaultPath: `${safeName}.pdf`');
    expect(invoices).toContain('defaultPath: "invoices.csv"');
    expect(pdf).not.toContain("defaultExportPath");
    expect(invoices).not.toContain("defaultExportPath");
    expect(settings).not.toContain("export_folder");
    expect(types).not.toContain("export_folder");
  });
});
