import { describe, expect, it } from "vitest";

import { calculateLineTotals } from "@/features/create-pages/create-shared/utils/create-order.calculations";
import type {
  CreateLookupOption,
  ProductRow,
} from "@/features/create-pages/create-shared/utils/create-order.types";
import {
  applyTaxCodeToRow,
  filterTaxCodesForSide,
  formatTaxCodeLabel,
  taxRateForCode,
} from "@/features/create-pages/create-shared/utils/product-tax-codes";

const tax = (code: string, rate: number, category: string, name = code): CreateLookupOption => ({
  category,
  code,
  name,
  rate,
});

const codes: CreateLookupOption[] = [
  tax("IN-18", 18, "I", "Input GST 18"),
  tax("IN-12", 12, "I", "Input GST 12"),
  tax("OUT-18", 18, "O", "Output GST 18"),
  tax("OUT-5", 5, "O", "Output GST 5"),
  tax("LEGACY", 0, ""),
];

describe("filterTaxCodesForSide", () => {
  it("keeps purchase (I) codes and uncategorized rows", () => {
    const filtered = filterTaxCodesForSide(codes, "purchase");
    expect(filtered.map((item) => item.code)).toEqual(["IN-18", "IN-12", "LEGACY"]);
  });

  it("keeps sales (O) codes and uncategorized rows", () => {
    const filtered = filterTaxCodesForSide(codes, "sales");
    expect(filtered.map((item) => item.code)).toEqual(["OUT-18", "OUT-5", "LEGACY"]);
  });

  it("always keeps the current row code even when it is the other side", () => {
    const filtered = filterTaxCodesForSide(codes, "purchase", "OUT-18");
    expect(filtered[0]?.code).toBe("OUT-18");
    expect(filtered.map((item) => item.code)).toContain("IN-18");
  });

  it("synthesizes an option when the current code is missing from the list", () => {
    const filtered = filterTaxCodesForSide(codes, "purchase", "OLD-TAX");
    expect(filtered[0]).toEqual({ code: "OLD-TAX", name: "OLD-TAX" });
  });
});

describe("taxRateForCode / applyTaxCodeToRow", () => {
  it("resolves OVTG rate for a tax group", () => {
    expect(taxRateForCode(codes, "IN-12")).toBe(12);
    expect(applyTaxCodeToRow(codes, "OUT-5")).toEqual({ taxRate: 5, vatGroup: "OUT-5" });
  });

  it("returns 0 for a missing or blank code", () => {
    expect(taxRateForCode(codes, "")).toBe(0);
    expect(taxRateForCode(codes, "NOPE")).toBe(0);
  });
});

describe("product lookup prefers resolved TaxCode", () => {
  it("uses backend TaxCode before OITM VatGroupPu", async () => {
    const { mapProductLookup } =
      await import("@/features/create-pages/create-shared/api/create-shared.mapper");
    const mapped = mapProductLookup({
      ItemCode: "SKU-1",
      ItemName: "Item",
      TaxCode: "OUT-18",
      TaxRate: 18,
      VatGroupPu: "IN-18",
      VatGroupSa: "OUT-18",
    });
    expect(mapped.vatGroup).toBe("OUT-18");
    expect(mapped.taxRate).toBe(18);
  });
});

describe("formatTaxCodeLabel", () => {
  it("includes code, name, and rate", () => {
    expect(formatTaxCodeLabel(tax("IN-18", 18, "I", "Input GST 18"))).toBe(
      "IN-18 — Input GST 18 (18%)",
    );
  });
});

describe("calculateLineTotals tax rate", () => {
  const baseRow = {
    comment: "",
    currency: "INR",
    discountAmount: 0,
    discountPercent: 0,
    id: "1",
    price: 100,
    productCode: "SKU",
    productName: "Item",
    quantity: 2,
    stock: 0,
    vatGroup: "IN-18",
    warehouseCode: "WH",
  } satisfies Omit<ProductRow, "taxRate">;

  it("changes line tax when the tax rate changes", () => {
    const at18 = calculateLineTotals({ ...baseRow, taxRate: 18 });
    const at5 = calculateLineTotals({ ...baseRow, taxRate: 5 });
    expect(at18.lineNet).toBe(200);
    expect(at18.lineTax).toBe(36);
    expect(at5.lineTax).toBe(10);
    expect(at5.lineTotal).not.toBe(at18.lineTotal);
  });
});
