/**
 * Money math for Invokas.
 *
 * All monetary values are integers in MINOR units (cents). Quantities are
 * integers in MILLI units (1/1000 of a unit). Discounts are integers in
 * BASIS POINTS (100 bp = 1%). Floating point is never used for money — every
 * operation is exact integer arithmetic up to a single final division that is
 * rounded half-up to the nearest cent.
 *
 * Line total:  quantity × unit_price × (1 − discount/10000)  → rounded per line.
 * Subtotal:    Σ line totals.
 * Total:       subtotal − document discount.
 *
 * Structure keeps tax addition a one-place change later: introduce a
 * `taxBp` and a `taxMinor` step between subtotal and total without touching
 * components or the schema.
 */

export const MINOR_PER_UNIT = 100;
export const BPS_PER_PERCENT = 100;
export const MILLI_PER_UNIT = 1000;

/** Rounds half-up to the nearest integer (minor unit). */
export function roundMinor(value: number): number {
  return Math.floor(value + 0.5);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export interface LineInput {
  /** Quantity in milli-units (three decimal places). */
  quantityMilli: number;
  /** Unit price in minor units (cents). */
  unitPriceMinor: number;
  /** Line discount in basis points (0..10000). */
  discountBp: number;
}

/** Line total in minor units, rounded half-up per line. */
export function lineTotalMinor(quantityMilli: number, unitPriceMinor: number, discountBp: number): number {
  if (quantityMilli <= 0 || unitPriceMinor <= 0) return 0;
  const factor = 10000 - clamp(Math.round(discountBp), 0, 10000);
  // (qtyMilli * priceMinor * factor) / (MILLI_PER_UNIT * 10000)
  return roundMinor((quantityMilli * unitPriceMinor * factor) / 10_000_000);
}

/** Sum of line totals in minor units. */
export function subtotalMinor(lines: readonly LineInput[]): number {
  let sum = 0;
  for (const line of lines) {
    sum += lineTotalMinor(line.quantityMilli, line.unitPriceMinor, line.discountBp);
  }
  return sum;
}

/** Document discount amount (minor units) from a basis-point percentage of the subtotal. */
export function discountMinorFromBp(subtotal: number, discountBp: number): number {
  if (subtotal <= 0) return 0;
  const bp = clamp(Math.round(discountBp), 0, 10000);
  return roundMinor((subtotal * bp) / 10000);
}

/** Final total: subtotal minus the document discount amount (minor units). */
export function totalMinor(subtotal: number, discountMinor: number): number {
  const d = clamp(discountMinor, 0, subtotal);
  return subtotal - d;
}

/** Full invoice computation from lines + document discount (bp). */
export function computeInvoiceTotals(
  lines: readonly LineInput[],
  documentDiscountBp: number,
): { subtotal: number; discount: number; total: number } {
  const subtotal = subtotalMinor(lines);
  const discount = discountMinorFromBp(subtotal, documentDiscountBp);
  const total = totalMinor(subtotal, discount);
  return { subtotal, discount, total };
}

/* ---- Conversion helpers for the editor (decimal input → integer units) ---- */

/** Converts a decimal euro amount to minor units (cents), rounded half-up. */
export function eurosToMinor(value: number): number {
  return roundMinor(value * 100);
}

/** Converts a decimal quantity to milli-units (three decimals). */
export function quantityToMilli(value: number): number {
  return Math.round(value * 1000);
}

/** Converts a percentage to basis points. */
export function percentToBp(value: number): number {
  return Math.round(value * 100);
}
