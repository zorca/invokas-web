import { describe, expect, it } from "vitest";
import { readLogoDataUrl, importLogo } from "./logo";
describe("browser logo", () => {
  it("reads stored PNG/JPEG data URLs without a filesystem", async () => {
    expect(await readLogoDataUrl("data:image/png;base64,aGVsbG8=")).toBe("data:image/png;base64,aGVsbG8=");
    expect(await readLogoDataUrl("C:/private/logo.png")).toBeNull();
    expect(await readLogoDataUrl("data:image/svg+xml,<svg/>")).toBeNull();
  });
  it("rejects an expired file selection", async () => {
    await expect(importLogo("missing")).rejects.toThrow();
  });
});
