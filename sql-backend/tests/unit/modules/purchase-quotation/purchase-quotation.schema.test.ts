import { describe, expect, it } from "vitest";

import {
  CreatePurchaseQuotationSchema,
  PurchaseQuotationListQuerySchema,
} from "@/modules/purchase-quotation/purchase-quotation.schema";

const validLine = {
  itemCode: "A0001",
  lineNum: 0,
  quantity: 1,
  unitPrice: 10,
};

const validCreate = {
  cardCode: "V001",
  docDate: "2024-06-01",
  docNum: 1001,
  lines: [validLine],
};

describe("CreatePurchaseQuotationSchema", () => {
  it("accepts a valid create payload", () => {
    expect(CreatePurchaseQuotationSchema.safeParse(validCreate).success).toBe(true);
  });

  it("rejects empty lines", () => {
    expect(CreatePurchaseQuotationSchema.safeParse({ ...validCreate, lines: [] }).success).toBe(
      false,
    );
  });

  it("rejects non-positive quantity", () => {
    expect(
      CreatePurchaseQuotationSchema.safeParse({
        ...validCreate,
        lines: [{ ...validLine, quantity: 0 }],
      }).success,
    ).toBe(false);
  });

  it("rejects missing cardCode", () => {
    const { cardCode: _c, ...rest } = validCreate;
    expect(CreatePurchaseQuotationSchema.safeParse(rest).success).toBe(false);
  });
});

describe("PurchaseQuotationListQuerySchema", () => {
  it("applies default page and limit", () => {
    const result = PurchaseQuotationListQuerySchema.parse({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });
});
