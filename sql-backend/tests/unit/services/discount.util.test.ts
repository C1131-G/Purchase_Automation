import { describe, expect, it } from "vitest";

import {
  calculateDiscountAmount,
  calculateLineTotal,
  calculateNetTotal,
} from "@/services/discount.util";

describe("calculateDiscountAmount", () => {
  it("returns discount amount for line", () => {
    expect(calculateDiscountAmount(100, 2, 10)).toBe(20);
  });
});

describe("calculateNetTotal", () => {
  it("returns net after discount", () => {
    expect(calculateNetTotal(100, 2, 10)).toBe(180);
  });
});

describe("calculateLineTotal", () => {
  it("matches net total helper", () => {
    expect(calculateLineTotal(50, 3, 0)).toBe(150);
  });
});
