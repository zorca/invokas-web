import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { addDays, monthStartIso, now, toIsoDate, todayIso } from "./date";

/**
 * These helpers only misbehave where the local timezone is offset from UTC, so
 * the suite pins an Eastern European one (+02:00/+03:00) via `test.env` in
 * vitest.config.ts. Under UTC, every expectation below would have passed even
 * with the UTC-based implementation this file is meant to lock out.
 */
const PINNED_TZ = "Europe/Vilnius";

beforeEach(() => {
  expect(process.env.TZ, `TZ must be pinned to ${PINNED_TZ}`).toBe(PINNED_TZ);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("addDays", () => {
  it("is identity for a zero-day shift", () => {
    // The regression that started all of this: a "shift" of zero days moved the
    // date one day back, which shifted every term computed from the issue date.
    for (const iso of ["2026-10-11", "2026-01-01", "2026-12-31", "2027-03-01"]) {
      expect(addDays(iso, 0)).toBe(iso);
    }
  });

  it("counts whole calendar days across month, year and leap boundaries", () => {
    expect(addDays("2026-10-11", 14)).toBe("2026-10-25");
    expect(addDays("2026-10-11", -14)).toBe("2026-09-27");
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2027-01-01", -1)).toBe("2026-12-31");
    expect(addDays("2027-02-28", 1)).toBe("2027-03-01");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("survives the daylight-saving switches", () => {
    // Vilnius springs forward on 29 March 2026 and falls back on 25 October.
    expect(addDays("2026-03-28", 1)).toBe("2026-03-29");
    expect(addDays("2026-03-29", 1)).toBe("2026-03-30");
    expect(addDays("2026-10-24", 1)).toBe("2026-10-25");
    expect(addDays("2026-10-25", 1)).toBe("2026-10-26");
    expect(addDays("2026-10-25", 7)).toBe("2026-11-01");
  });
});

describe("todayIso", () => {
  it("stays on the local calendar day while UTC is still yesterday", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 1, 1, 0, 0));

    // Guard the premise: at 01:00 local on 1 January, UTC has not caught up,
    // which is exactly the window the UTC-based implementation got wrong.
    expect(new Date().toISOString().slice(0, 10)).toBe("2025-12-31");
    expect(todayIso()).toBe("2026-01-01");
  });

  it("agrees with the UTC date in the middle of the day", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 11, 12, 0, 0));
    expect(todayIso()).toBe("2026-10-11");
  });
});

describe("now", () => {
  it("returns a local timestamp, not the UTC one", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 5, 9, 8, 7));

    expect(now()).toBe("2026-07-05T09:08:07");
    // The same instant in UTC, which the implementation used to store.
    expect(new Date().toISOString().slice(0, 19)).toBe("2026-07-05T06:08:07");
  });
});

describe("monthStartIso", () => {
  it("returns the first local day of the month", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 11, 12, 0, 0));

    expect(monthStartIso()).toBe("2026-10-01");
    expect(monthStartIso(3)).toBe("2026-07-01");
    expect(monthStartIso(11)).toBe("2025-11-01");
  });

  it("does not slip into the previous month in the early local hours", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 1, 1, 0, 0));

    expect(new Date().toISOString().slice(0, 10)).toBe("2026-09-30");
    expect(monthStartIso()).toBe("2026-10-01");
  });
});

describe("toIsoDate", () => {
  it("reads the local calendar fields of a Date", () => {
    expect(toIsoDate(new Date(2026, 0, 9, 0, 30, 0))).toBe("2026-01-09");
  });
});
