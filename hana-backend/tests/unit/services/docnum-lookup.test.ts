import { describe, expect, it } from "vitest";

import { getSafeDocNumLimit } from "@/services/docnum-lookup";

describe("getSafeDocNumLimit", () => {
  it("returns default when limit is undefined", () => {
    expect(getSafeDocNumLimit()).toBe(10);
  });

  it("returns default when limit is not finite", () => {
    expect(getSafeDocNumLimit(Number.NaN)).toBe(10);
  });

  it("returns default when limit is less than 1", () => {
    expect(getSafeDocNumLimit(0)).toBe(10);
  });

  it("clamps to the maximum allowed limit", () => {
    expect(getSafeDocNumLimit(500_000)).toBe(100_000);
  });

  it("truncates fractional limits", () => {
    expect(getSafeDocNumLimit(12.9)).toBe(12);
  });
});
