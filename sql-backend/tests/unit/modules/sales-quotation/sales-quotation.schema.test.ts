import { describe, expect, it } from "vitest";

import {
  CreateSalesQuotationSchema,
  SalesQuotationListQuerySchema,
} from "@/modules/sales-quotation/sales-quotation.schema";

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

describe("CreateSalesQuotationSchema", () => {
  it("accepts a valid create payload", () => {
    expect(CreateSalesQuotationSchema.safeParse(validCreate).success).toBe(true);
  });

  it("rejects empty lines", () => {
    expect(CreateSalesQuotationSchema.safeParse({ ...validCreate, lines: [] }).success).toBe(false);
  });

  it("rejects non-positive quantity", () => {
    expect(
      CreateSalesQuotationSchema.safeParse({
        ...validCreate,
        lines: [{ ...validLine, quantity: 0 }],
      }).success,
    ).toBe(false);
  });

  it("rejects missing cardCode", () => {
    const { cardCode: _c, ...rest } = validCreate;
    expect(CreateSalesQuotationSchema.safeParse(rest).success).toBe(false);
  });
});

describe("SalesQuotationListQuerySchema", () => {
  it("applies default page and limit", () => {
    const result = SalesQuotationListQuerySchema.parse({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });
});
