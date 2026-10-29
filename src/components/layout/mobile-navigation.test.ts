import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AppSidebar } from "./AppSidebar";

 describe("mobile navigation", () => {
  it.each([false, true])("keeps all navigation labels visible on phones when collapsed=%s", (collapsed) => {
    const html = renderToStaticMarkup(React.createElement(AppSidebar, {
      page: { name: "invoices" }, navigate: () => {}, collapsed, onToggleCollapse: () => {},
    }));
    expect(html).toContain("w-full md:w-");
    expect(html).toContain("flex md:block");
    expect(html).toContain('aria-current="page"');
    expect(html).toMatch(/<span class="[^"]*truncate[^"]*">nav.invoices<\/span>/);
    expect(html).toMatch(/<span class="[^"]*truncate[^"]*">nav.clients<\/span>/);
    expect(html).toMatch(/<span class="[^"]*truncate[^"]*">nav.settings<\/span>/);
  });
});
