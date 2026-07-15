import { describe, expect, it } from "vitest";

import { SalesQuotationQuerySchema } from "@/modules/sales-quotation/sales-quotation.schema";

describe("SalesQuotationQuerySchema", () => {
  it("accepts empty query", () => {
    expect(SalesQuotationQuerySchema.safeParse({}).success).toBe(true);
  });

  it("accepts explicit page and limit", () => {
    const result = SalesQuotationQuerySchema.safeParse({ page: 2, limit: 25 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(2);
      expect(result.data.limit).toBe(25);
    }
  });
});
