import { describe, expect, it } from "vitest";

import { PurchaseQuotationQuerySchema } from "@/modules/purchase-quotation/purchase-quotation.schema";

describe("PurchaseQuotationQuerySchema", () => {
  it("accepts empty query", () => {
    expect(PurchaseQuotationQuerySchema.safeParse({}).success).toBe(true);
  });

  it("accepts explicit page and limit", () => {
    const result = PurchaseQuotationQuerySchema.safeParse({ page: 2, limit: 25 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(2);
      expect(result.data.limit).toBe(25);
    }
  });
});
