import { describe, expect, it } from "vitest";

import { shouldPersistQueryKey } from "@/shared/utils/query-cache-persistence";

describe("shouldPersistQueryKey", () => {
  it("persists auth organization and user", () => {
    expect(shouldPersistQueryKey(["auth", "organization"])).toBe(true);
    expect(shouldPersistQueryKey(["auth", "user"])).toBe(true);
  });

  it("persists static create-shared master keys", () => {
    expect(shouldPersistQueryKey(["create-shared", "vendors-ic-v1"])).toBe(true);
    expect(shouldPersistQueryKey(["create-shared", "customers-ic-v1"])).toBe(true);
    expect(shouldPersistQueryKey(["create-shared", "warehouses"])).toBe(true);
    expect(shouldPersistQueryKey(["create-shared", "sales-employees"])).toBe(true);
    expect(shouldPersistQueryKey(["create-shared", "tax-codes"])).toBe(true);
    expect(shouldPersistQueryKey(["create-shared", "uoms"])).toBe(true);
    expect(shouldPersistQueryKey(["create-shared", "price-lists"])).toBe(true);
    expect(shouldPersistQueryKey(["create-shared", "branches"])).toBe(true);
  });

  it("rejects dynamic / heavy query keys", () => {
    expect(shouldPersistQueryKey(["create-shared", "products-v3", "grpo", "", "sku", 20])).toBe(
      false,
    );
    expect(shouldPersistQueryKey(["create-shared", "product-warehouse-stocks", "SKU"])).toBe(false);
    expect(shouldPersistQueryKey(["create-shared", "business-partner-addresses", "V001"])).toBe(
      false,
    );
    expect(shouldPersistQueryKey(["create-shared", "warehouse-bins", "WH01"])).toBe(false);
    expect(shouldPersistQueryKey(["purchase-orders", "list"])).toBe(false);
    expect(shouldPersistQueryKey([])).toBe(false);
  });
});
