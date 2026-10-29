import { describe, expect, it } from "vitest";
import {
  lineTotalMinor,
  subtotalMinor,
  discountMinorFromBp,
  totalMinor,
  computeInvoiceTotals,
  roundMinor,
} from "./money";

describe("money — rounding", () => {
  it("rounds half up to the nearest minor unit", () => {
    expect(roundMinor(1.5)).toBe(2);
    expect(roundMinor(1.4)).toBe(1);
    expect(roundMinor(2.5)).toBe(3);
    expect(roundMinor(0.4)).toBe(0);
  });
});

describe("money — line totals", () => {
  it("computes quantity × unit price with no discount", () => {
    // 10 units × €100.00 = €1000.00
    expect(lineTotalMinor(10_000, 100_00, 0)).toBe(1000_00);
  });

  it("applies line discount in basis points", () => {
    // 10 units × €100.00 with 10% discount → €900.00
    expect(lineTotalMinor(10_000, 100_00, 1000)).toBe(900_00);
  });

  it("rounds each line half up", () => {
    // 1.5 units × €3.33 = €4.995 → €5.00
    expect(lineTotalMinor(1500, 333, 0)).toBe(500);
  });

  it("caps discount at 100%", () => {
    expect(lineTotalMinor(1000, 100, 20_000)).toBe(0);
  });
});

describe("money — document totals", () => {
  it("computes subtotal, document discount and total", () => {
    const lines = [
      { quantityMilli: 1000, unitPriceMinor: 1000, discountBp: 0 }, // €10.00
      { quantityMilli: 2000, unitPriceMinor: 500, discountBp: 0 }, // €10.00
      { quantityMilli: 1000, unitPriceMinor: 1000, discountBp: 1000 }, // €9.00
    ];
    const subtotal = subtotalMinor(lines);
    expect(subtotal).toBe(2900); // €29.00

    const discount = discountMinorFromBp(subtotal, 500); // 5%
    expect(discount).toBe(145); // €1.45

    expect(totalMinor(subtotal, discount)).toBe(2755); // €27.55
  });
});

describe("money — acceptance criterion", () => {
  it("3 lines, 10% line discount, 5% document discount", () => {
    const lines = [
      { quantityMilli: 2000, unitPriceMinor: 5000, discountBp: 1000 }, // 2 × €50 = €100 → €90.00
      { quantityMilli: 1000, unitPriceMinor: 20000, discountBp: 1000 }, // 1 × €200 → €180.00
      { quantityMilli: 3000, unitPriceMinor: 1050, discountBp: 1000 }, // 3 × €10.50 = €31.50 → €28.35
    ];
    const { subtotal, discount, total } = computeInvoiceTotals(lines, 500);
    expect(subtotal).toBe(29835); // €298.35
    expect(discount).toBe(1492); // €14.92 (5% of €298.35, half-up)
    expect(total).toBe(28343); // €283.43
  });
});
