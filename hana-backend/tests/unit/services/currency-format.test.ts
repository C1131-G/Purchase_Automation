import { describe, expect, it } from "vitest";

import {
  getDefaultCurrencyCode,
  isUnresolvedCurrency,
  resolveCurrencyCode,
} from "@/services/currency-format";

describe("currency-format", () => {
  it("treats empty and SAP local $ as unresolved", () => {
    expect(isUnresolvedCurrency("")).toBe(true);
    expect(isUnresolvedCurrency(null)).toBe(true);
    expect(isUnresolvedCurrency("$")).toBe(true);
    expect(isUnresolvedCurrency("  $  ")).toBe(true);
    expect(isUnresolvedCurrency("FJD")).toBe(false);
    expect(isUnresolvedCurrency("USD")).toBe(false);
  });

  it("resolveCurrencyCode uses value when real ISO, else env default", () => {
    expect(resolveCurrencyCode("USD")).toBe("USD");
    expect(resolveCurrencyCode("$")).toBe(getDefaultCurrencyCode());
    expect(resolveCurrencyCode("")).toBe(getDefaultCurrencyCode());
    expect(resolveCurrencyCode("$", "EUR")).toBe("EUR");
    expect(resolveCurrencyCode("NZD", "EUR")).toBe("NZD");
  });

  it("env default is a non-empty 3-letter code from DEFAULT_CURRENCY_CODE", () => {
    const code = getDefaultCurrencyCode();
    expect(code.length).toBeGreaterThanOrEqual(3);
    expect(isUnresolvedCurrency(code)).toBe(false);
  });
});
