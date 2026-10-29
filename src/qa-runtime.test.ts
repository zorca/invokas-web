import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

function read(path: string): string {
  return readFileSync(`${ROOT}/${path}`, "utf8");
}

describe("development runtime", () => {
  it("starts a new profile with the system theme", () => {
    const app = read("src/App.tsx");
    const html = read("index.html");
    const onboarding = read("src/pages/OnboardingPage.tsx");

    expect(html).toContain('var theme = localStorage.getItem("invokas:theme") || "system"');
    expect(app).toContain('defaultTheme="system"');
    expect(app).toContain('scriptProps={{ type: "application/json" }}');
    expect(onboarding).toContain('setTheme("system")');
  });

  it("blocks opening downloaded HTML before modules load", () => {
    const html = read("index.html");
    expect(html).toContain('location.protocol !== "https:"');
    expect(html).toContain('location.protocol !== "http:"');
    expect(read("src/main.tsx")).toContain("runtimeProblem(location.protocol");
  });

  it("restarts the PDF worker when its document modules change during development", () => {
    const service = read("src/lib/pdf/pdfService.ts");

    expect(service).toContain("import.meta.hot.dispose");
    expect(service).toContain("worker?.terminate()");
    expect(service).toContain("worker = null");
    expect(service).toContain("api = null");
  });
});
