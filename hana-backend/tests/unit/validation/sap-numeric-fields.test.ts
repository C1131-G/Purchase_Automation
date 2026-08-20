import { describe, expect, it } from "vitest";

import {
  sapDiscountPercentSchema,
  sapNonnegativeAmountSchema,
  sapPositiveQuantitySchema,
  strictDecimalQuerySchema,
} from "@/validation/schemas/inputs/sap-numeric-fields";
import {
  RfqIdParamsSchema,
  SubmitRfqBodySchema,
  UpdateRfqBodySchema,
} from "@/modules/intercompany/api/ic.schema";

describe("SAP numeric input schemas", () => {
  it("enforces positive SAP quantities with six decimal places", () => {
    expect(sapPositiveQuantitySchema.safeParse(1.123456).success).toBe(true);
    expect(sapPositiveQuantitySchema.safeParse(0).success).toBe(false);
    expect(sapPositiveQuantitySchema.safeParse(-1).success).toBe(false);
    expect(sapPositiveQuantitySchema.safeParse(1.1234567).success).toBe(false);
  });

  it("enforces non-negative amounts and discount bounds", () => {
    expect(sapNonnegativeAmountSchema.safeParse(0).success).toBe(true);
    expect(sapNonnegativeAmountSchema.safeParse(-0.01).success).toBe(false);
    expect(sapDiscountPercentSchema.safeParse(99.999).success).toBe(true);
    expect(sapDiscountPercentSchema.safeParse(100.001).success).toBe(false);
  });

  it("rejects exponent and signed query notation before coercion", () => {
    expect(strictDecimalQuerySchema.safeParse("123.45").success).toBe(true);
    expect(strictDecimalQuerySchema.safeParse("1e3").success).toBe(false);
    expect(strictDecimalQuerySchema.safeParse("+10").success).toBe(false);
  });

  it("requires valid commercial values for IC RFQ saves and submits", () => {
    expect(
      UpdateRfqBodySchema.safeParse({
        lines: [{ lineNum: 0, quantity: 2, unitPrice: -1 }],
      }).success,
    ).toBe(false);
    expect(
      SubmitRfqBodySchema.safeParse({
        lines: [{ deliveryDate: "not-a-date", lineNum: 0, quantity: 2, unitPrice: 10 }],
      }).success,
    ).toBe(false);
    expect(
      SubmitRfqBodySchema.safeParse({
        lines: [{ deliveryDate: "2026-08-20", lineNum: 0, quantity: 2, unitPrice: 10 }],
      }).success,
    ).toBe(true);
  });

  it("rejects malformed IC path ids and invalid calendar dates before the controller", () => {
    expect(RfqIdParamsSchema.safeParse({ id: "1e3" }).success).toBe(false);
    expect(RfqIdParamsSchema.safeParse({ id: "+10" }).success).toBe(false);
    expect(RfqIdParamsSchema.safeParse({ id: "10" }).success).toBe(true);
    expect(
      SubmitRfqBodySchema.safeParse({
        lines: [{ deliveryDate: "2026-02-30", lineNum: 0, quantity: 2, unitPrice: 10 }],
      }).success,
    ).toBe(false);
  });
});
