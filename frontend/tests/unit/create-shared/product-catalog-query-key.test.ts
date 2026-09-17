import { describe, expect, it } from "vitest";

import { createSharedQueries } from "@/features/create-pages/create-shared/api/create-shared.queries";

describe("product catalog query keys", () => {
  it("scopes PQ, PO, and SQ catalogs separately for the same vendor", () => {
    const pq = createSharedQueries.products(
      undefined,
      undefined,
      50,
      "purchase",
      undefined,
      "V001",
      "purchase-quotation",
    ).queryKey;
    const po = createSharedQueries.products(
      undefined,
      undefined,
      50,
      "purchase",
      undefined,
      "V001",
      "purchase-order",
    ).queryKey;
    const sq = createSharedQueries.products(
      undefined,
      undefined,
      50,
      "purchase",
      undefined,
      "V001",
      "sales-quotation",
    ).queryKey;

    expect(pq).not.toEqual(po);
    expect(pq).not.toEqual(sq);
    expect(po).not.toEqual(sq);
    expect(pq).toContain("purchase-quotation");
    expect(sq).toContain("sales-quotation");
  });

  it("scopes different vendors under the same document separately", () => {
    const vendorA = createSharedQueries.products(
      undefined,
      undefined,
      50,
      "purchase",
      undefined,
      "V001",
      "purchase-order",
    ).queryKey;
    const vendorB = createSharedQueries.products(
      undefined,
      undefined,
      50,
      "purchase",
      undefined,
      "V002",
      "purchase-order",
    ).queryKey;

    expect(vendorA).not.toEqual(vendorB);
  });

  it("uses the same query key for prefetch and popup browse (one cache, no 10-then-50 refetch)", () => {
    const prefetch = createSharedQueries.products(
      undefined,
      undefined,
      50,
      "purchase",
      undefined,
      "V001",
      "purchase-order",
    ).queryKey;
    const popup = createSharedQueries.products(
      undefined,
      undefined,
      50,
      "purchase",
      undefined,
      "V001",
      "purchase-order",
    ).queryKey;
    const firstPageOnly = createSharedQueries.products(
      undefined,
      undefined,
      10,
      "purchase",
      undefined,
      "V001",
      "purchase-order",
    ).queryKey;

    expect(prefetch).toEqual(popup);
    expect(firstPageOnly).not.toEqual(popup);
  });
});
