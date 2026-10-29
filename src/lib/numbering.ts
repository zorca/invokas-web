/**
 * Invoice number generation from a mask.
 *
 * Tokens:
 *   {YYYY} — 4-digit year
 *   {YY}   — 2-digit year
 *   {MM}   — 2-digit month
 *   {DD}   — 2-digit day
 *   {NNNN} — sequence number zero-padded to the number of Ns
 *   {N}    — sequence number without padding
 *
 * Periodicity: the finest date token in the mask defines the reset period.
 * `{DD}` → daily, `{MM}` → monthly, `{YYYY}`/`{YY}` → yearly, none → forever.
 * The period key is stored in the `sequences` table so a new period restarts
 * the counter from the configured start number.
 */

export type PeriodGranularity = "day" | "month" | "year" | "none";

export interface DateParts {
  year: number;
  month: number;
  day: number;
}

/**
 * Splits a `YYYY-MM-DD` calendar date into the parts a mask is built from and a
 * period key is derived from.
 */
export function dateParts(iso: string): DateParts {
  const [year, month, day] = iso.split("-").map(Number);
  return { year, month, day };
}

function pad(value: number, width: number): string {
  return String(value).padStart(width, "0");
}

/** Finest date token present in the mask. */
export function periodGranularity(mask: string): PeriodGranularity {
  if (mask.includes("{DD}")) return "day";
  if (mask.includes("{MM}")) return "month";
  if (mask.includes("{YYYY}") || mask.includes("{YY}")) return "year";
  return "none";
}

/** Stable key for the sequences table identifying mask + period. */
export function periodKey(mask: string, d: DateParts): string {
  switch (periodGranularity(mask)) {
    case "day":
      return `${mask}|${d.year}-${pad(d.month, 2)}-${pad(d.day, 2)}`;
    case "month":
      return `${mask}|${d.year}-${pad(d.month, 2)}`;
    case "year":
      return `${mask}|${d.year}`;
    default:
      return mask;
  }
}

/** Renders the final invoice number for a mask, sequence value and date. */
export function formatNumber(mask: string, sequence: number, d: DateParts): string {
  const n = Math.max(0, Math.trunc(sequence));
  return mask
    .replace(/\{YYYY\}/g, String(d.year))
    .replace(/\{YY\}/g, pad(d.year % 100, 2))
    .replace(/\{MM\}/g, pad(d.month, 2))
    .replace(/\{DD\}/g, pad(d.day, 2))
    .replace(/\{N+\}/g, (token) => {
      const width = token.length - 2; // number of 'N' characters
      if (width <= 1) return String(n);
      return pad(n, width);
    });
}

/** True if the mask contains a date token and therefore resets across periods. */
export function maskHasPeriod(mask: string): boolean {
  return periodGranularity(mask) !== "none";
}
