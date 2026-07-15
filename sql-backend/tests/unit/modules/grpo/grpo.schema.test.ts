import { describe, expect, it } from "vitest";

import { CreateGrpoSchema, GrpoListQuerySchema } from "@/modules/grpo/grpo.schema";

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

describe("CreateGrpoSchema", () => {
  it("accepts a valid create payload", () => {
    expect(CreateGrpoSchema.safeParse(validCreate).success).toBe(true);
  });

  it("rejects empty lines", () => {
    expect(CreateGrpoSchema.safeParse({ ...validCreate, lines: [] }).success).toBe(false);
  });

  it("rejects non-positive quantity", () => {
    expect(
      CreateGrpoSchema.safeParse({
        ...validCreate,
        lines: [{ ...validLine, quantity: 0 }],
      }).success,
    ).toBe(false);
  });

  it("rejects missing cardCode", () => {
    const { cardCode: _c, ...rest } = validCreate;
    expect(CreateGrpoSchema.safeParse(rest).success).toBe(false);
  });
});

describe("GrpoListQuerySchema", () => {
  it("applies default page and limit", () => {
    const result = GrpoListQuerySchema.parse({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });
});
