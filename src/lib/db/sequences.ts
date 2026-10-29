import { updateDatabase } from "./db";
import { formatNumber, periodKey, type DateParts } from "@/lib/numbering";
export interface AllocatedNumber { number: string; sequenceKey: string; }
/** Allocation spends a number; failed/abandoned saves may leave gaps, never reuse. */
export async function allocateNumber(mask: string, startNumber: number, date: DateParts): Promise<AllocatedNumber> {
  if (!Number.isFinite(startNumber) || !Number.isSafeInteger(Math.trunc(startNumber))) throw new Error("Invalid sequence start number");
  return updateDatabase(state => {
    const key = periodKey(mask, date);
    const next = Object.prototype.hasOwnProperty.call(state.sequences, key) ? state.sequences[key] + 1 : Math.max(0, Math.trunc(startNumber));
    Object.defineProperty(state.sequences, key, {value: next, enumerable: true, configurable: true, writable: true});
    return {number: formatNumber(mask, next, date), sequenceKey: key};
  });
}

