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

  it("products-by-codes returns empty without cardCode", async () => {
    await expect(getProductsByCodes("DB", ["A", "B"], "purchase")).resolves.toEqual([]);
  });
});
