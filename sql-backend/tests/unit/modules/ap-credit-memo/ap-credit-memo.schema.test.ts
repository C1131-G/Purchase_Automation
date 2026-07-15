import { describe, expect, it } from "vitest";

import {
  CreateApCreditMemoSchema,
  ApCreditMemoListQuerySchema,
} from "@/modules/ap-credit-memo/ap-credit-memo.schema";

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

describe("CreateApCreditMemoSchema", () => {
  it("accepts a valid create payload", () => {
    expect(CreateApCreditMemoSchema.safeParse(validCreate).success).toBe(true);
  });

  it("rejects empty lines", () => {
    expect(CreateApCreditMemoSchema.safeParse({ ...validCreate, lines: [] }).success).toBe(false);
  });

  it("rejects non-positive quantity", () => {
    expect(
      CreateApCreditMemoSchema.safeParse({
        ...validCreate,
        lines: [{ ...validLine, quantity: 0 }],
      }).success,
    ).toBe(false);
  });

  it("rejects missing cardCode", () => {
    const { cardCode: _c, ...rest } = validCreate;
    expect(CreateApCreditMemoSchema.safeParse(rest).success).toBe(false);
  });
});

describe("ApCreditMemoListQuerySchema", () => {
  it("applies default page and limit", () => {
    const result = ApCreditMemoListQuerySchema.parse({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });
});
