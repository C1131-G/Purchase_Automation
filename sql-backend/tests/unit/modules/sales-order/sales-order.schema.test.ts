import { describe, expect, it } from "vitest";

import {
  CreateSalesOrderSchema,
  SalesOrderListQuerySchema,
  UpdateSalesOrderSchema,
} from "@/modules/sales-order/sales-order.schema";

const validLine = {
  itemCode: "A0001",
  lineNum: 0,
  quantity: 2,
  unitPrice: 25,
};

const validCreate = {
  cardCode: "C001",
  docDate: "2024-06-01",
  docNum: 9001001,
  lines: [validLine],
};

describe("CreateSalesOrderSchema", () => {
  it("accepts a valid create payload", () => {
    const result = CreateSalesOrderSchema.safeParse(validCreate);

    expect(result.success).toBe(true);
  });

  it("rejects a payload with empty lines", () => {
    const result = CreateSalesOrderSchema.safeParse({
      ...validCreate,
      lines: [],
    });

    expect(result.success).toBe(false);
  });

  it("rejects a line with non-positive quantity", () => {
    const result = CreateSalesOrderSchema.safeParse({
      ...validCreate,
      lines: [{ ...validLine, quantity: -1 }],
    });

    expect(result.success).toBe(false);
  });
});

describe("UpdateSalesOrderSchema", () => {
  it("accepts a partial update payload", () => {
    const result = UpdateSalesOrderSchema.safeParse({ cardName: "Acme" });

    expect(result.success).toBe(true);
  });
});

describe("SalesOrderListQuerySchema", () => {
  it("applies default page and limit", () => {
    const result = SalesOrderListQuerySchema.parse({});

    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });
});
