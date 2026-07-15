import { describe, expect, it } from "vitest";

import { calculateHeaderDiscount, calculateLineDiscountAmount } from "@/services/discount-calc";

describe("calculateHeaderDiscount", () => {
  it("returns zero percent when there are no lines", () => {
    expect(calculateHeaderDiscount([])).toEqual({ percent: 0, amount: 0 });
  });

  it("aggregates line discounts into header percent and amount", () => {
    const result = calculateHeaderDiscount([
      { price: 100, quantity: 1, discountPercent: 10 },
      { price: 50, quantity: 2, discountPercent: 0 },
    ]);

    // gross 200, discount 10 → 5%
    expect(result.amount).toBe(10);
    expect(result.percent).toBe(5);
  });
});

describe("calculateLineDiscountAmount", () => {
  it("returns discount amount for a single line", () => {
    expect(calculateLineDiscountAmount({ price: 100, quantity: 2, discountPercent: 10 })).toBe(20);
  });
});
