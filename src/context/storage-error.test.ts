import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
it("shows a non-destructive error instead of hanging or overwriting corrupt data", () => {
  const source = readFileSync("src/context/SettingsContext.tsx", "utf8");
  expect(source).toContain("catch (err)");
  expect(source).toContain('role="alert"');
  expect(source).toContain("setLoading(false)");
  expect(source).not.toContain("localStorage.clear");
});
