import { describe, expect, it } from "vitest";

import {
  CreateArInvoiceSchema,
  ArInvoiceListQuerySchema,
} from "@/modules/ar-invoice/ar-invoice.schema";

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

describe("CreateArInvoiceSchema", () => {
  it("accepts a valid create payload", () => {
    expect(CreateArInvoiceSchema.safeParse(validCreate).success).toBe(true);
  });

  it("rejects empty lines", () => {
    expect(CreateArInvoiceSchema.safeParse({ ...validCreate, lines: [] }).success).toBe(false);
  });

  it("rejects non-positive quantity", () => {
    expect(
      CreateArInvoiceSchema.safeParse({
        ...validCreate,
        lines: [{ ...validLine, quantity: 0 }],
      }).success,
    ).toBe(false);
  });

  it("rejects missing cardCode", () => {
    const { cardCode: _c, ...rest } = validCreate;
    expect(CreateArInvoiceSchema.safeParse(rest).success).toBe(false);
  });
});

describe("ArInvoiceListQuerySchema", () => {
  it("applies default page and limit", () => {
    const result = ArInvoiceListQuerySchema.parse({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });
});
