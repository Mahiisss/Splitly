import { SplitlyError } from "./errors";
import type { Minor } from "./types";

/** Throws unless `value` is a whole, non-negative, safe integer. */
export function assertMinor(value: number, label = "amount"): asserts value is Minor {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new SplitlyError(`${label} must be a non-negative whole number of minor units, got ${value}`);
  }
}

const AMOUNT_PATTERN = /^(\d+)(?:\.(\d{1,2}))?$/;

/**
 * Parses what a user typed ("1,250.5", "99", "0.75") into minor units.
 * Works on the string directly, so there is no floating-point rounding.
 * Returns null for anything that is not a valid amount with at most 2 decimals.
 */
export function parseAmount(input: string): Minor | null {
  const cleaned = input.trim().replace(/,/g, "");
  const match = AMOUNT_PATTERN.exec(cleaned);
  if (!match) return null;

  const whole = Number(match[1]);
  const fraction = Number((match[2] ?? "").padEnd(2, "0"));
  const minor = whole * 100 + fraction;

  return Number.isSafeInteger(minor) ? minor : null;
}

/** Formats minor units for display, e.g. formatMoney(125050) -> "₹1,250.50". */
export function formatMoney(amount: Minor, currency = "INR", locale = "en-IN"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount / 100);
}
