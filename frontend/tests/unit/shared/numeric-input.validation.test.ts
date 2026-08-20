import { describe, expect, it } from "vitest";

import { NUMERIC_PROFILE } from "@vendor-portal/validation-contracts";

import {
  decimalDraftSchemas,
  numericDraftError,
  nextNumericDraft,
  parseNumericDraft,
} from "@/shared/validation/numeric-input.validation";
import { zodIssuesToFieldErrors } from "@/shared/validation/field-errors";

describe("numeric input validation", () => {
  it("uses the shared SAP precision contract", () => {
    expect(NUMERIC_PROFILE.sapDecimal.fractionDigits).toBe(6);
    expect(NUMERIC_PROFILE.documentTotal.integerDigits).toBe(9);
  });

  it("accepts permitted decimal drafts and rejects exponent and sign notation", () => {
    expect(decimalDraftSchemas.sapDecimal.safeParse("123.456789").success).toBe(true);
    expect(decimalDraftSchemas.sapDecimal.safeParse("123.").success).toBe(true);

    for (const value of ["1e3", "1E3", "+1", "-1", "1..2", "one", " 1"]) {
      expect(decimalDraftSchemas.sapDecimal.safeParse(value).success).toBe(false);
    }
  });

  it("enforces the profile-specific precision and business ranges on commit", () => {
    expect(parseNumericDraft("12.5", "positiveQuantity")).toBe(12.5);
    expect(parseNumericDraft("12.1234567", "positiveQuantity")).toBeUndefined();
    expect(parseNumericDraft("0", "positiveQuantity")).toBeUndefined();
    expect(parseNumericDraft("100.001", "discountPercent")).toBeUndefined();
    expect(parseNumericDraft("99.999", "discountPercent")).toBe(99.999);
    expect(parseNumericDraft("12.345", "currencyAmount")).toBeUndefined();
  });

  it("keeps integer-only profiles free of decimals and signs", () => {
    expect(parseNumericDraft("12", "positiveIntegerQuantity")).toBe(12);
    expect(parseNumericDraft("12.5", "positiveIntegerQuantity")).toBeUndefined();
    expect(decimalDraftSchemas.digitsOnly.safeParse("123456").success).toBe(true);
    expect(decimalDraftSchemas.digitsOnly.safeParse("+123").success).toBe(false);
  });

  it("retains the previous draft and exposes a message for rejected pasted notation", () => {
    expect(nextNumericDraft("12.5", "1e3", "sapDecimal")).toBe("12.5");
    expect(numericDraftError("12.1234567", "sapDecimal")).toBe(
      "Use digits and one decimal point only",
    );
  });

  it("maps composed schema failures to feature-addressable field paths", () => {
    expect(
      zodIssuesToFieldErrors([
        { code: "custom", message: "Quantity is required", path: ["lines", 0, "quantity"] },
      ]),
    ).toEqual({ "lines.0.quantity": "Quantity is required" });
  });
});
