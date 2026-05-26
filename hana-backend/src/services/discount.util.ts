/*
 * discount.util.ts
 *
 * Provides functions to calculate header‑level discount percent and amount
 * with integer‑cents arithmetic to avoid floating‑point rounding errors.
 * All monetary values are expected in the base currency units (e.g., USD).
 */

/**
 * Represents a line item used for discount aggregation.
 */
export interface DiscountLine {
  /** Unit price (per item) */
  price: number;
  /** Quantity of items */
  quantity: number;
  /** Discount percent for the line (0‑100) */
  discountPercent: number;
}

/**
 * Calculates the total gross (price * quantity) and total discount amount
 * for a collection of lines using integer‑cents arithmetic.
 * Returns both the header‑level discount percent (rounded to 2 decimals) and
 * the total discount amount (rounded to 2 decimals).
 */
export function calculateHeaderDiscount(lines: DiscountLine[]) {
  // Convert to cents to keep integer precision.
  let totalGrossCents = 0;
  let totalDiscountCents = 0;

  for (const line of lines) {
    const priceCents = Math.round((line.price ?? 0) * 100);
    const qty = Math.max(0, line.quantity ?? 0);
    const lineGrossCents = priceCents * qty;
    totalGrossCents += lineGrossCents;

    const discPct = line.discountPercent ?? 0;
    const lineDiscountCents = Math.round((lineGrossCents * discPct) / 100);
    totalDiscountCents += lineDiscountCents;
  }

  const discountPercent = totalGrossCents > 0 ? (totalDiscountCents / totalGrossCents) * 100 : 0;
  const roundedDiscountPercent = Math.round(discountPercent * 100) / 100; // 2 decimals
  const roundedDiscountAmount = Math.round(totalDiscountCents) / 100; // back to currency units, 2 decimals

  return {
    percent: roundedDiscountPercent,
    amount: roundedDiscountAmount,
  };
}

/**
 * Helper to calculate a line's discount amount (currency) from its percent.
 * Returns a value rounded to 2 decimals.
 */
export function calculateLineDiscountAmount(line: DiscountLine) {
  const priceCents = Math.round((line.price ?? 0) * 100);
  const lineGrossCents = priceCents * Math.max(0, line.quantity ?? 0);
  const discPct = line.discountPercent ?? 0;
  const discountCents = Math.round((lineGrossCents * discPct) / 100);
  return Math.round(discountCents) / 100;
}
