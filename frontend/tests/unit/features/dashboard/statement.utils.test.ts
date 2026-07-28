import { describe, expect, it } from "vitest";

import {
  balanceCaptionForRole,
  creditUtilizationPercent,
  hasBalanceAgingGap,
  sumAgingTotal,
  sumOverdueAging,
} from "@/features/dashboard/utils/statement.utils";

describe("statement.utils", () => {
  it("sums aging and overdue buckets", () => {
    const aging = { d0_30: 100, d31_60: 20, d61_90: 5, d90_plus: 2 };
    expect(sumAgingTotal(aging)).toBe(127);
    expect(sumOverdueAging(aging)).toBe(27);
  });

  it("flags material balance vs aging gaps", () => {
    expect(hasBalanceAgingGap(1000, 1000)).toBe(false);
    expect(hasBalanceAgingGap(1000, 850)).toBe(true);
    expect(hasBalanceAgingGap(0, 0)).toBe(false);
  });

  it("returns role-aware balance captions", () => {
    expect(balanceCaptionForRole("vendor").title).toContain("You owe");
    expect(balanceCaptionForRole("customer").title).toContain("They owe you");
  });

  it("computes credit utilization when credit line exists", () => {
    expect(creditUtilizationPercent(250, 1000)).toBe(25);
    expect(creditUtilizationPercent(250, 0)).toBeNull();
  });
});
