import { describe, expect, it } from "vitest";

import {
  addToAging,
  assignAgingBucket,
  emptyAging,
  sumAging,
} from "@/modules/dashboard/dashboard.statement.queries";

describe("overview statement aging buckets (P4)", () => {
  it("maps age days into 0–30 / 31–60 / 61–90 / 90+", () => {
    expect(assignAgingBucket(-5)).toBe("d0_30");
    expect(assignAgingBucket(0)).toBe("d0_30");
    expect(assignAgingBucket(30)).toBe("d0_30");
    expect(assignAgingBucket(31)).toBe("d31_60");
    expect(assignAgingBucket(60)).toBe("d31_60");
    expect(assignAgingBucket(61)).toBe("d61_90");
    expect(assignAgingBucket(90)).toBe("d61_90");
    expect(assignAgingBucket(91)).toBe("d90_plus");
    expect(assignAgingBucket(400)).toBe("d90_plus");
  });

  it("adds open amounts into the correct bucket", () => {
    let aging = emptyAging();
    aging = addToAging(aging, 10, 100);
    aging = addToAging(aging, 45, 50.5);
    aging = addToAging(aging, 75, 20);
    aging = addToAging(aging, 120, 5);

    expect(aging).toEqual({
      d0_30: 100,
      d31_60: 50.5,
      d61_90: 20,
      d90_plus: 5,
    });
  });

  it("sums partner aging into totals", () => {
    const totals = sumAging([
      { d0_30: 10, d31_60: 0, d61_90: 5, d90_plus: 0 },
      { d0_30: 1.11, d31_60: 2.22, d61_90: 0, d90_plus: 3 },
    ]);

    expect(totals).toEqual({
      d0_30: 11.11,
      d31_60: 2.22,
      d61_90: 5,
      d90_plus: 3,
    });
  });
});
