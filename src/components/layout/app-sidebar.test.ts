import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppSidebar } from "./AppSidebar";

function render(): string {
  return renderToStaticMarkup(
    React.createElement(AppSidebar, {
      page: { name: "invoices" },
      navigate: () => {},
      collapsed: false,
      onToggleCollapse: () => {},
    }),
  );
}

describe("sidebar brand", () => {
  it("draws the app mark next to the name", () => {
    const html = render();
    expect(html).toContain('data-testid="invokas-mark"');
    expect(html).toContain("#7379F0");
    expect(html).toContain("#54E0B0");
  });

  it("no longer shows the placeholder letter tile", () => {
    const html = render();
    expect(html).not.toContain(">i</span>");
  });
});
