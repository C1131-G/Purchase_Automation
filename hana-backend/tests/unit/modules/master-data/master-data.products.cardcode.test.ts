import { beforeEach, describe, expect, it, vi } from "vitest";

const loadProductsForTenant = vi.fn();

vi.mock("@/modules/master-data/master-data.products-load", () => ({
  loadProductsForTenant: (...args: unknown[]) => loadProductsForTenant(...args),
}));

import { getProducts } from "@/modules/master-data/master-data.products";
import { getProductsByCodes } from "@/modules/master-data/master-data.products-by-codes";

describe("getProducts / getProductsByCodes — OSCN CardCode gate", () => {
  beforeEach(() => {
    loadProductsForTenant.mockReset();
    loadProductsForTenant.mockResolvedValue([{ ItemCode: "X" }]);
  });

  it("returns empty without cardCode (no full item master)", async () => {
    await expect(getProducts("DB", undefined, undefined, 10, "purchase")).resolves.toEqual([]);
    expect(loadProductsForTenant).not.toHaveBeenCalled();
  });

  it("loads when cardCode is present", async () => {
    await getProducts("DB", undefined, undefined, 10, "purchase", undefined, "V0011");
    expect(loadProductsForTenant).toHaveBeenCalled();
    const args = loadProductsForTenant.mock.calls[0];
    expect(args?.[7]).toBe("V0011");
  });

  it("forwards PQ catalog scope to the browse loader", async () => {
    await getProducts(
      "DB-PQ",
      undefined,
      undefined,
      10,
      "purchase",
      undefined,
      "V0011",
      "purchase-quotation",
    );
    expect(loadProductsForTenant.mock.calls[0]?.[8]).toBe("purchase-quotation");
  });

  it("first browse of 10 warms 50 so a later 50 does not reload HANA", async () => {
    const rows = Array.from({ length: 50 }, (_, index) => ({ ItemCode: `I${index}` }));
    loadProductsForTenant.mockResolvedValue(rows);

    const first = await getProducts(
      "DB-WARM",
      undefined,
      undefined,
      10,
      "purchase",
      undefined,
      "V1",
    );
    expect(first).toHaveLength(10);
    expect(loadProductsForTenant).toHaveBeenCalledTimes(1);
    expect(loadProductsForTenant.mock.calls[0]?.[3]).toBe(50);

    loadProductsForTenant.mockClear();
    const second = await getProducts(
      "DB-WARM",
      undefined,
      undefined,
      50,
      "purchase",
      undefined,
      "V1",
    );
    expect(second).toHaveLength(50);
    expect(loadProductsForTenant).not.toHaveBeenCalled();
  });

  it("products-by-codes returns empty without cardCode", async () => {
    await expect(getProductsByCodes("DB", ["A", "B"], "purchase")).resolves.toEqual([]);
  });
});
