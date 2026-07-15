import { describe, expect, it } from "vitest";

import { PurchaseOrderQuerySchema } from "@/modules/purchase-order/purchase-order.schema";

describe("PurchaseOrderQuerySchema", () => {
  it("accepts empty query", () => {
    const result = PurchaseOrderQuerySchema.safeParse({});

    expect(result.success).toBe(true);
  });

  it("accepts explicit page and limit", () => {
    const result = PurchaseOrderQuerySchema.safeParse({ page: 2, limit: 25 });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(2);
      expect(result.data.limit).toBe(25);
    }
  });

  it("accepts a valid date range", () => {
    const result = PurchaseOrderQuerySchema.safeParse({
      DocDateStart: "2024-01-01",
      DocDateEnd: "2024-12-31",
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid DocDateStart format", () => {
    const result = PurchaseOrderQuerySchema.safeParse({
      DocDateStart: "01-01-2024",
    });

    expect(result.success).toBe(false);
  });

  it("rejects DocTotal without operator when only one side set via refine", () => {
    const result = PurchaseOrderQuerySchema.safeParse({
      DocTotal: 100,
    });

    // refine requires operator + value together or neither
    expect(result.success).toBe(false);
  });
});
