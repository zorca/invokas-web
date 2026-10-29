import { afterEach, describe, expect, it, vi } from "vitest";
import { save, writeFile } from "./browser-files";
afterEach(() => vi.unstubAllGlobals());
describe("browser downloads", () => {
  it("uses a safe filename rather than a native path", async () => {
    expect(await save({ defaultPath: "invoices.csv" })).toBe("invoices.csv");
    expect(await save({ defaultPath: "../unsafe/report.pdf" })).toBe("report.pdf");
  });
  it("downloads actual bytes through a temporary blob URL", async () => {
    const click = vi.fn(); const remove = vi.fn();
    const anchor = { href: "", download: "", click, remove };
    const append = vi.fn();
    vi.stubGlobal("document", { createElement: () => anchor, body: { append } });
    const create = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test");
    await writeFile("invoice.pdf", new Uint8Array([37, 80, 68, 70]));
    expect(create).toHaveBeenCalledWith(expect.any(Blob));
    expect(anchor.download).toBe("invoice.pdf");
    expect(anchor.href).toBe("blob:test");
    expect(click).toHaveBeenCalledOnce();
    expect(remove).toHaveBeenCalledOnce();
    create.mockRestore();
  });
});
