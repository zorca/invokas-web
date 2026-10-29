import { describe, expect, it } from "vitest";
import {
  CLIENT_TYPES,
  CLIENT_TYPE_LABEL_KEYS,
  DEFAULT_CLIENT_TYPE,
  clientCode,
  typeFieldsToClear,
} from "./client-types";

/**
 * The list shows one code per client, and the client form asks for the codes of the chosen type.
 * Both need the same answer to "which code identifies this client", so the rule lives here rather
 * than in the column definition.
 */
function codes(patch: Partial<Parameters<typeof clientCode>[0]>) {
  return {
    client_type: "company",
    company_code: "",
    personal_code: "",
    self_employment_id: "",
    ...patch,
  };
}

describe("client identity codes", () => {
  it("identifies a legal entity by its company number", () => {
    expect(clientCode(codes({ client_type: "company", company_code: "123456789" }))).toBe(
      "123456789",
    );
  });

  it("identifies a natural person by their personal code", () => {
    expect(
      clientCode(
        codes({ client_type: "person", personal_code: "38601010000", company_code: "123456789" }),
      ),
    ).toBe("38601010000");
  });

  it("falls back to the IV certificate number for a person without a personal code", () => {
    expect(
      clientCode(codes({ client_type: "person", self_employment_id: "IV-123456" })),
    ).toBe("IV-123456");
  });

  it("shows nothing for a client that carries no code at all", () => {
    expect(clientCode(codes({}))).toBe("");
    expect(clientCode(codes({ client_type: "person" }))).toBe("");
  });

  it("labels every type the form can offer", () => {
    for (const type of CLIENT_TYPES) {
      expect(CLIENT_TYPE_LABEL_KEYS[type]).toBeTruthy();
    }
    expect(Object.keys(CLIENT_TYPE_LABEL_KEYS)).toHaveLength(CLIENT_TYPES.length);
  });

  it("drops the fields of the type being left behind on a type switch", () => {
    expect(typeFieldsToClear("person")).toEqual(["company", "company_code"]);
    expect(typeFieldsToClear("company")).toEqual(["personal_code", "self_employment_id"]);
  });

  it("defaults to a type the form's own enum accepts", () => {
    expect(CLIENT_TYPES).toContain(DEFAULT_CLIENT_TYPE);
  });
});
