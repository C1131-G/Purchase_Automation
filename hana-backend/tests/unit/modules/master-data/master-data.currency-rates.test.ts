import { beforeEach, describe, expect, it, vi } from "vitest";

const executeTenantQuery = vi.fn();

vi.mock("@/db/tenant-query", () => ({
  executeTenantQuery: (...args: unknown[]) => executeTenantQuery(...args),
}));

import { getLatestCurrencyRates } from "@/modules/master-data/master-data.currency-rates";

describe("getLatestCurrencyRates", () => {
  beforeEach(() => executeTenantQuery.mockReset());

  it("returns the newest valid rate per currency from ORTT", async () => {
    executeTenantQuery.mockResolvedValue([
      { Currency: "USD", Rate: 2.25, RateDate: "2026-08-27" },
      { Currency: "USD", Rate: 2.2, RateDate: "2026-08-26" },
      { Currency: "NZD", Rate: 1.35, RateDate: "2026-08-25" },
    ]);

    await expect(getLatestCurrencyRates("TENANT", ["usd", "USD", "NZD"])).resolves.toEqual(
      new Map([
        ["USD", 2.25],
        ["NZD", 1.35],
      ]),
    );
    expect(executeTenantQuery).toHaveBeenCalledWith(
      "TENANT",
      expect.stringContaining('"RateDate" <= CURRENT_DATE'),
      ["USD", "NZD"],
    );
  });

  it("does not query ORTT when there are no foreign currencies", async () => {
    await expect(getLatestCurrencyRates("TENANT", [])).resolves.toEqual(new Map());
    expect(executeTenantQuery).not.toHaveBeenCalled();
  });
});
