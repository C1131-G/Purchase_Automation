import { describe, expect, it } from "vitest";

import { createSharedQueries } from "@/features/create-pages/create-shared/api/create-shared.queries";

describe("product catalog query keys", () => {
  it("scopes PQ, PO, and GRPO catalogs separately for the same vendor", () => {
    const pq = createSharedQueries.products(
      undefined,
      undefined,
      10,
      "purchase",
      undefined,
      "V001",
      "purchase-quotation",
    ).queryKey;
    const po = createSharedQueries.products(
      undefined,
      undefined,
      10,
      "purchase",
      undefined,
      "V001",
      "purchase-order",
    ).queryKey;
    const grpo = createSharedQueries.products(
      undefined,
      undefined,
      10,
      "purchase",
      undefined,
      "V001",
      "grpo",
    ).queryKey;

    expect(pq).not.toEqual(po);
    expect(pq).not.toEqual(grpo);
    expect(po).not.toEqual(grpo);
    expect(pq).toContain("purchase-quotation");
    expect(grpo).toContain("grpo");
  });

  it("scopes different vendors under the same document separately", () => {
    const vendorA = createSharedQueries.products(
      undefined,
      undefined,
      10,
      "purchase",
      undefined,
      "V001",
      "grpo",
    ).queryKey;
    const vendorB = createSharedQueries.products(
      undefined,
      undefined,
      10,
      "purchase",
      undefined,
      "V002",
      "grpo",
    ).queryKey;

    expect(vendorA).not.toEqual(vendorB);
  });
});
