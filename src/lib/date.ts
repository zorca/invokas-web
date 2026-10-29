/**
 * Calendar dates and timestamps of the app, all in the local timezone.
 *
 * Every date the user meets here - the issue date, the due date, the period a
 * number belongs to, the month filter of the list - is a local calendar date.
 * Deriving one by calling `toISOString()` on a local `Date` hands back the UTC
 * calendar date instead, which is the *previous* day in every timezone east of
 * UTC: `addDays(iso, 0)` stopped being identity and moved a day back, a 14-day
 * payment term landed on day 13, and an invoice saved at 01:00 on 1 January was
 * dated 31 December - in the year the number is built from, too. Nothing
 * downstream could notice, because the shifted date was written to the database
 * and printed on the PDF exactly like a correct one.
 *
 * Timestamps from `now()` are local as well: every other date in the database is
 * a local calendar date, and the app is a single-machine desktop app, so there
 * is no server clock to normalize against.
 */

/** Zero-pads a single date component. */
function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** The `YYYY-MM-DD` local calendar date of a `Date`. */
export function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Today, as a `YYYY-MM-DD` local calendar date. */
export function todayIso(): string {
  return toIsoDate(new Date());
}

/**
 * Shifts an ISO `YYYY-MM-DD` date by whole days. The arithmetic happens on
 * local midnight, so the answer is the calendar day `days` away even across a
 * daylight-saving switch.
 */
export function addDays(iso: string, days: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
}

/** The local `YYYY-MM-DDTHH:MM:SS` timestamp the schema stores. */
export function now(): string {
  const date = new Date();
  return `${toIsoDate(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/**
 * The first day of the month `monthsBack` months before the current one, used
 * as the inclusive lower bound of the period filter.
 */
export function monthStartIso(monthsBack = 0): string {
  const today = new Date();
  return toIsoDate(new Date(today.getFullYear(), today.getMonth() - monthsBack, 1));
}
