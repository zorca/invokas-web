import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("project favicon", () => {
  it("uses the project mark with a deployment-aware URL", () => {
    const html = readFileSync("index.html", "utf8");
    expect(html).toContain('rel="icon" type="image/svg+xml" href="%BASE_URL%favicon.svg"');
    const svg = readFileSync("public/favicon.svg", "utf8");
    const mark = readFileSync("src/components/InvokasMark.tsx", "utf8");
    for (const path of mark.matchAll(/\sd="([^"]+)"/g)) {
      expect(svg).toContain(`d="${path[1]}"`);
    }
    expect(svg).toContain('viewBox="0 0 512 512"');
    expect(svg).toContain('transform="translate(-142 -150) scale(1.6)"');
  });
});
