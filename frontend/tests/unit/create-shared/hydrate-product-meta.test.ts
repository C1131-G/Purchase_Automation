import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

import {
  resolveHydrateProductMeta,
  scheduleHydrateWarehouseStocks,
  taxRatesFromProductMeta,
  uniqueHydrateItemCodes,
} from "@/features/create-pages/create-shared/utils/hydrate-product-meta";
import type { ProductLookupItem } from "@/features/create-pages/create-shared/api/create-shared.types";

const product = (code: string, taxRate = 0): ProductLookupItem =>
  ({
    code,
    name: `Name ${code}`,
    price: 10,
    taxRate,
    stock: 0,
  }) as ProductLookupItem;

describe("uniqueHydrateItemCodes", () => {
  it("dedupes and trims empty codes", () => {
    expect(uniqueHydrateItemCodes([" A ", "A", "", null, "B", undefined])).toEqual(["A", "B"]);
  });
});

describe("resolveHydrateProductMeta", () => {
  it("uses one products-by-codes batch call for multiple line items", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const fetchQuery = vi.spyOn(queryClient, "fetchQuery").mockImplementation(async (options) => {
      const key = (options as { queryKey: unknown[] }).queryKey;
      // productsByCodes key: ["create-shared","products-by-codes", codesKey, type, ...]
      if (key.includes("products-by-codes")) {
        return [product("SKU-1", 5), product("SKU-2", 10)];
      }
      return [];
    });

    const map = await resolveHydrateProductMeta(
      queryClient,
      ["SKU-1", "SKU-2", "SKU-1"],
      "purchase",
    );

    expect(map.get("SKU-1")?.code).toBe("SKU-1");
    expect(map.get("SKU-2")?.taxRate).toBe(10);
    // One batch call, not N limit-1 product searches.
    const batchCalls = fetchQuery.mock.calls.filter((call) => {
      const key = (call[0] as { queryKey: unknown[] }).queryKey;
      return key.includes("products-by-codes");
    });
    expect(batchCalls).toHaveLength(1);
    const limit1Calls = fetchQuery.mock.calls.filter((call) => {
      const key = (call[0] as { queryKey: unknown[] }).queryKey;
      return key.includes("products-v2");
    });
    expect(limit1Calls).toHaveLength(0);

    fetchQuery.mockRestore();
    queryClient.clear();
  });

  it("uses cached limit-1 results without refetch when present", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const { createSharedQueries } =
      await import("@/features/create-pages/create-shared/api/create-shared.queries");
    queryClient.setQueryData(
      createSharedQueries.products(undefined, "CACHED", 1, "purchase").queryKey,
      [product("CACHED", 15)],
    );
    const fetchQuery = vi.spyOn(queryClient, "fetchQuery");

    const map = await resolveHydrateProductMeta(queryClient, ["CACHED"], "purchase");

    expect(map.get("CACHED")?.taxRate).toBe(15);
    expect(fetchQuery).not.toHaveBeenCalled();

    fetchQuery.mockRestore();
    queryClient.clear();
  });

  it("falls back to limit-1 product lookups when batch fails", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const fetchQuery = vi.spyOn(queryClient, "fetchQuery").mockImplementation(async (options) => {
      const key = (options as { queryKey: unknown[] }).queryKey;
      if (key.includes("products-by-codes")) {
        throw new Error("batch unavailable");
      }
      // products key shape: [..., warehouse, search, limit, type, priceList]
      const search = String(key[key.length - 4] ?? "");
      return [product(search || "X")];
    });

    const map = await resolveHydrateProductMeta(queryClient, ["SKU-1", "SKU-2"], "purchase");

    expect(map.get("SKU-1")?.code).toBe("SKU-1");
    expect(map.get("SKU-2")?.code).toBe("SKU-2");
    expect(
      fetchQuery.mock.calls.some((call) => {
        const key = (call[0] as { queryKey: unknown[] }).queryKey;
        return key.includes("products-v2");
      }),
    ).toBe(true);

    fetchQuery.mockRestore();
    queryClient.clear();
  });
});

describe("scheduleHydrateWarehouseStocks", () => {
  it("resolves stocks via one batch call without blocking the caller", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const fetchQuery = vi.spyOn(queryClient, "fetchQuery").mockImplementation(async (options) => {
      const key = (options as { queryKey: unknown[] }).queryKey;
      if (key.includes("product-warehouse-stocks-batch")) {
        return [
          { itemCode: "SKU-1", code: "WH01", name: "Main", stock: 42 },
          { itemCode: "SKU-2", code: "WH01", name: "Main", stock: 7 },
        ];
      }
      return [];
    });

    const onStocks = vi.fn();
    scheduleHydrateWarehouseStocks(queryClient, ["SKU-1", "SKU-2"], "WH01", onStocks);

    expect(onStocks).not.toHaveBeenCalled();
    await vi.waitFor(() => {
      expect(onStocks).toHaveBeenCalledTimes(1);
    });
    expect(onStocks.mock.calls[0]?.[0].get("SKU-1")).toBe(42);
    expect(onStocks.mock.calls[0]?.[0].get("SKU-2")).toBe(7);

    const batchCalls = fetchQuery.mock.calls.filter((call) => {
      const key = (call[0] as { queryKey: unknown[] }).queryKey;
      return key.includes("product-warehouse-stocks-batch");
    });
    expect(batchCalls).toHaveLength(1);

    queryClient.clear();
  });
});

describe("taxRatesFromProductMeta", () => {
  it("maps tax rates from product meta without network", () => {
    const productByCode = new Map([
      ["A", product("A", 12)],
      ["B", product("B", 0)],
    ]);
    const rates = taxRatesFromProductMeta(productByCode);
    expect(rates.get("A")).toBe(12);
    expect(rates.get("B")).toBe(0);
  });
});
