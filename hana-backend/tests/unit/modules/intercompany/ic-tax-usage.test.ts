import { describe, expect, it } from "vitest";

import {
  flow1LineTaxUsage,
  flow2LineTaxUsage,
  normalizeTaxCode,
} from "@/modules/intercompany/infrastructure/ic-tax-usage";

describe("ic-tax-usage", () => {
  it("normalizeTaxCode trims and empties to null", () => {
    expect(normalizeTaxCode("  GST  ")).toBe("GST");
    expect(normalizeTaxCode("")).toBeNull();
    expect(normalizeTaxCode(null)).toBeNull();
  });

  it("flow1LineTaxUsage sets pq + sq only", () => {
    const row = flow1LineTaxUsage({
      itemCode: "ITEM1",
      lineNum: 0,
      pqTaxCode: "BUYER-PU",
      sqTaxCode: "SELL-SA",
    });
    expect(row).toEqual({
      arTaxCode: null,
      itemCode: "ITEM1",
      lineNum: 0,
      poTaxCode: null,
      pqTaxCode: "BUYER-PU",
      sqTaxCode: "SELL-SA",
    });
  });

  it("flow2LineTaxUsage sets po + ar only", () => {
    const row = flow2LineTaxUsage({
      arTaxCode: "AR-SA",
      itemCode: "ITEM2",
      lineNum: 1,
      poTaxCode: "PO-PU",
    });
    expect(row).toEqual({
      arTaxCode: "AR-SA",
      itemCode: "ITEM2",
      lineNum: 1,
      poTaxCode: "PO-PU",
      pqTaxCode: null,
      sqTaxCode: null,
    });
  });
});
