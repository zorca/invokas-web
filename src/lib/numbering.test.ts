import { describe, expect, it } from "vitest";
import { formatNumber, periodKey, periodGranularity, maskHasPeriod, dateParts } from "./numbering";

describe("numbering — mask formatting", () => {
  it("formats INV-{YYYY}-{NNNN} starting at 42", () => {
    const d = { year: 2026, month: 10, day: 7 };
    expect(formatNumber("INV-{YYYY}-{NNNN}", 42, d)).toBe("INV-2026-0042");
    expect(formatNumber("INV-{YYYY}-{NNNN}", 43, d)).toBe("INV-2026-0043");
  });

  it("zero-pads {NNNN} and leaves {N} unpadded", () => {
    const d = { year: 2026, month: 1, day: 5 };
    expect(formatNumber("{YY}-{MM}-{DD}-{N}", 7, d)).toBe("26-01-05-7");
    expect(formatNumber("{NNN}", 7, d)).toBe("007");
    expect(formatNumber("{N}", 7, d)).toBe("7");
  });
});

describe("numbering — periodicity", () => {
  it("detects year granularity and changes period key on year change", () => {
    const mask = "INV-{YYYY}-{NNNN}";
    expect(periodGranularity(mask)).toBe("year");
    expect(periodKey(mask, { year: 2026, month: 1, day: 1 })).toBe("INV-{YYYY}-{NNNN}|2026");
    expect(periodKey(mask, { year: 2027, month: 1, day: 1 })).toBe("INV-{YYYY}-{NNNN}|2027");
    expect(maskHasPeriod(mask)).toBe(true);
  });

  it("detects month granularity", () => {
    const mask = "INV-{YYYY}{MM}-{NN}";
    expect(periodGranularity(mask)).toBe("month");
    expect(periodKey(mask, { year: 2026, month: 10, day: 1 })).toBe("INV-{YYYY}{MM}-{NN}|2026-10");
    expect(periodKey(mask, { year: 2026, month: 11, day: 1 })).toBe("INV-{YYYY}{MM}-{NN}|2026-11");
  });

  it("detects day granularity", () => {
    const mask = "INV-{YYYY}{MM}{DD}-{NN}";
    expect(periodGranularity(mask)).toBe("day");
    expect(periodKey(mask, { year: 2026, month: 10, day: 7 })).toBe(
      "INV-{YYYY}{MM}{DD}-{NN}|2026-10-07",
    );
  });

  it("has no period for a date-less mask", () => {
    const mask = "INV-{NNNN}";
    expect(periodGranularity(mask)).toBe("none");
    expect(periodKey(mask, { year: 2026, month: 10, day: 7 })).toBe("INV-{NNNN}");
    expect(maskHasPeriod(mask)).toBe(false);
  });
});

describe("numbering — date parts", () => {
  it("splits an ISO calendar date into the parts a mask is built from", () => {
    expect(dateParts("2026-10-07")).toEqual({ year: 2026, month: 10, day: 7 });
    expect(dateParts("2026-01-05")).toEqual({ year: 2026, month: 1, day: 5 });
  });
});
