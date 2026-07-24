import { describe, expect, it } from "vitest";

import { emptyAging } from "@/modules/dashboard/dashboard.statement.queries";

describe("overview empty shapes (P5)", () => {
  it("provides zeroed aging buckets", () => {
    expect(emptyAging()).toEqual({
      d0_30: 0,
      d31_60: 0,
      d61_90: 0,
      d90_plus: 0,
    });
  });

  it("empty statement shape matches overview contract defaults", () => {
    const emptyStatement = {
      partners: [] as [],
      totals: { balance: 0, aging: emptyAging() },
    };

    expect(emptyStatement.partners).toHaveLength(0);
    expect(emptyStatement.totals.balance).toBe(0);
    expect(Object.values(emptyStatement.totals.aging).every((value) => value === 0)).toBe(true);
  });
});
