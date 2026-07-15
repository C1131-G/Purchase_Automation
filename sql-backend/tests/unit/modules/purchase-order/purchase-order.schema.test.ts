import { describe, expect, it } from "vitest";

import {
  CreatePurchaseOrderSchema,
  PurchaseOrderListQuerySchema,
  UpdatePurchaseOrderSchema,
} from "@/modules/purchase-order/purchase-order.schema";

const validLine = {
  itemCode: "A0001",
  lineNum: 0,
  quantity: 1,
  unitPrice: 10,
};

const validCreate = {
  cardCode: "V001",
  docDate: "2024-06-01",
  lines: [validLine],
};

describe("CreatePurchaseOrderSchema", () => {
  it("accepts a valid create payload", () => {
    const result = CreatePurchaseOrderSchema.safeParse(validCreate);

    expect(result.success).toBe(true);
  });

  it("rejects a payload with empty lines", () => {
    const result = CreatePurchaseOrderSchema.safeParse({
      ...validCreate,
      lines: [],
    });

    expect(result.success).toBe(false);
  });

  it("rejects a line with non-positive quantity", () => {
    const result = CreatePurchaseOrderSchema.safeParse({
      ...validCreate,
      lines: [{ ...validLine, quantity: 0 }],
    });

    expect(result.success).toBe(false);
  });

  it("rejects missing cardCode", () => {
    const result = CreatePurchaseOrderSchema.safeParse({
      docDate: "2024-06-01",
      lines: [validLine],
    });

    expect(result.success).toBe(false);
  });
});

describe("UpdatePurchaseOrderSchema", () => {
  it("accepts a partial update payload", () => {
    const result = UpdatePurchaseOrderSchema.safeParse({ comments: "updated" });

    expect(result.success).toBe(true);
  });
});

describe("PurchaseOrderListQuerySchema", () => {
  it("applies default page and limit", () => {
    const result = PurchaseOrderListQuerySchema.parse({});

    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });
});
