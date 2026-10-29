import type { AppLanguage } from "@/i18n";

/**
 * Maps an app language code to the Intl locale used for number/date/currency
 * formatting. English uses `en-GB` so dates render DD/MM/YYYY, matching the
 * European convention required by the product spec (07/10/2026).
 */
export const INTL_LOCALE: Record<AppLanguage, string> = {
  lt: "lt",
  ru: "ru",
  uk: "uk-UA",
  pl: "pl-PL",
  en: "en-GB",
};

/** Currency used as fallback when no explicit currency is configured. */
export const DEFAULT_CURRENCY = "EUR";

/**
 * Formats an integer amount in minor units (cents) as a localized currency
 * string. Lithuanian and Russian render `1 234,56 €`; English `€1,234.56`.
 */
export function formatCurrency(minor: number, currency: string, lang: AppLanguage): string {
  const locale = INTL_LOCALE[lang];
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency || DEFAULT_CURRENCY,
      currencyDisplay: "symbol",
    }).format(minor / 100);
  } catch {
    // Fall back for unknown currency codes (e.g. user-typed custom currency).
    return new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
      minor / 100,
    );
  }
}

/** Formats a plain decimal number (not currency). */
export function formatNumber(value: number, lang: AppLanguage, fractionDigits = 2): string {
  return new Intl.NumberFormat(INTL_LOCALE[lang], {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

export interface DateFormats {
  /** Long, human-readable: lt `2026 m. spalio 7 d.`, ru `07.10.2026`, en `07/10/2026`. */
  long: string;
  /** Short, sortable: always `YYYY-MM-DD`. */
  short: string;
}

const SHORT_RE = /^(\d{4})-(\d{2})-(\d{2})/;

/** Formats an ISO `YYYY-MM-DD` date according to the active language. */
export function formatDate(iso: string, lang: AppLanguage): DateFormats {
  const short = iso.slice(0, 10);
  const m = SHORT_RE.exec(iso);
  if (!m) return { long: short, short };
  const [, y, mo, d] = m;
  const year = Number(y);
  const month = Number(mo);
  const day = Number(d);

  let long: string;
  if (lang === "lt") {
    // Full format yields the genitive month form: "2026 m. spalio 7 d."
    long = new Intl.DateTimeFormat("lt", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(year, month - 1, day));
  } else {
    long = new Intl.DateTimeFormat(INTL_LOCALE[lang], {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(year, month - 1, day));
  }
  return { long, short };
}

/** Formats a quantity with up to three decimal places, trailing zeros trimmed. */
export function formatQuantity(value: number, lang: AppLanguage): string {
  return new Intl.NumberFormat(INTL_LOCALE[lang], {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(value);
}

/** Parses a localized decimal string back into a number. Accepts both `.` and `,`. */
export function parseDecimal(input: string): number {
  if (!input) return 0;
  const normalized = input.trim().replace(/\s/g, "").replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

export { DEFAULT_CURRENCY as defaultCurrency };
