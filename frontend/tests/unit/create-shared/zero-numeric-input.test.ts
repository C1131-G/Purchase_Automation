import { describe, expect, it } from "vitest";

import {
  commitZeroNumericBlur,
  draftAfterZeroNumericFocus,
  formatZeroNumericDisplay,
} from "@/features/create-pages/create-shared/utils/zero-numeric-input";

describe("formatZeroNumericDisplay", () => {
  it("shows 0.00 when idle at zero", () => {
    expect(formatZeroNumericDisplay(undefined, 0)).toBe("0.00");
  });

  it("keeps the draft while the user is typing", () => {
    expect(formatZeroNumericDisplay("", 0)).toBe("");
    expect(formatZeroNumericDisplay("5", 5)).toBe("5");
  });

  it("formats a non-zero value to two decimals", () => {
    expect(formatZeroNumericDisplay(undefined, 10)).toBe("10.00");
  });
});

describe("draftAfterZeroNumericFocus", () => {
  it("clears 0 so the user can type", () => {
    expect(draftAfterZeroNumericFocus(undefined, 0)).toBe("");
  });

  it("does not clear a non-zero value", () => {
    expect(draftAfterZeroNumericFocus(undefined, 7.5)).toBeUndefined();
  });

  it("leaves an existing draft alone", () => {
    expect(draftAfterZeroNumericFocus("1", 0)).toBe("1");
  });
});

describe("commitZeroNumericBlur", () => {
  it("restores 0 when the field is empty", () => {
    expect(commitZeroNumericBlur("")).toBe(0);
    expect(commitZeroNumericBlur("   ")).toBe(0);
  });

  it("parses a typed number", () => {
    expect(commitZeroNumericBlur("12.5")).toBe(12.5);
  });
});
