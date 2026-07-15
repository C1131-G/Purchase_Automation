import { describe, expect, it } from "vitest";

import { SalesOrderQuerySchema } from "@/modules/sales-order/sales-order.schema";

describe("SalesOrderQuerySchema", () => {
  it("accepts empty query", () => {
    const result = SalesOrderQuerySchema.safeParse({});

    expect(result.success).toBe(true);
  });

  it("accepts explicit page and limit", () => {
    const result = SalesOrderQuerySchema.safeParse({ page: 3, limit: 50 });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(3);
      expect(result.data.limit).toBe(50);
    }
  });

  it("accepts customer filter fields", () => {
    const result = SalesOrderQuerySchema.safeParse({
      CardCode: "C001",
      DocStatus: "Open",
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid DocDateEnd format", () => {
    const result = SalesOrderQuerySchema.safeParse({
      DocDateEnd: "not-a-date",
    });

    expect(result.success).toBe(false);
  });
});
