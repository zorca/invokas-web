import { describe, expect, it } from "vitest";
import { formatCurrency, formatDate, formatNumber } from "./format";

const NBSP = "\u00a0";

describe("format — currency in three locales", () => {
  it("Lithuanian: comma decimal, non-breaking space, € after", () => {
    expect(formatCurrency(123456, "EUR", "lt")).toBe(`1${NBSP}234,56${NBSP}€`);
  });

  it("Russian: comma decimal, non-breaking space, € after", () => {
    expect(formatCurrency(123456, "EUR", "ru")).toBe(`1${NBSP}234,56${NBSP}€`);
  });

  it("English: dot decimal, comma grouping, € before", () => {
    expect(formatCurrency(123456, "EUR", "en")).toBe("€1,234.56");
  });

  it("falls back for unknown currency codes", () => {
    expect(() => formatCurrency(100, "XXX", "en")).not.toThrow();
  });
});

describe("format — dates in three locales", () => {
  it("Lithuanian long and short", () => {
    expect(formatDate("2026-10-07", "lt").long).toBe("2026 m. spalio 7 d.");
    expect(formatDate("2026-10-07", "lt").short).toBe("2026-10-07");
  });

  it("Russian long", () => {
    expect(formatDate("2026-10-07", "ru").long).toBe("07.10.2026");
  });

  it("English long (DD/MM/YYYY)", () => {
    expect(formatDate("2026-10-07", "en").long).toBe("07/10/2026");
  });
});

describe("format — plain numbers", () => {
  it("groups thousands per locale", () => {
    expect(formatNumber(1234567.89, "en", 2)).toBe("1,234,567.89");
  });
});
