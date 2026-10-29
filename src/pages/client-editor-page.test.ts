import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * The client page keeps its actions in the header, outside the form element, the way the invoice
 * editor does. That only works while the Save button and the form agree on the same id — a button
 * without `form={CLIENT_FORM_ID}` renders fine and then does nothing at all when clicked, which no
 * type check can see.
 */
const form = readFileSync(`${process.cwd()}/src/components/clients/ClientForm.tsx`, "utf8");
const page = readFileSync(`${process.cwd()}/src/pages/ClientEditorPage.tsx`, "utf8");

describe("client editor header", () => {
  it("wires the header Save button to the form it has to submit", () => {
    const id = form.match(/export const CLIENT_FORM_ID = "([^"]+)"/)?.[1];
    expect(id).toBeTruthy();
    expect(form).toContain("id={CLIENT_FORM_ID}");
    expect(page).toContain("form={CLIENT_FORM_ID}");
    expect(page).toMatch(/type="submit"\s+form=\{CLIENT_FORM_ID\}/);
  });

  it("keeps the action buttons clear of the panel edge", () => {
    const header = page.match(/<div className="flex items-center gap-2 border-b[^"]*"/)?.[0] ?? "";
    expect(header).toContain("px-4");
    expect(header).toContain("py-2");
  });
});
