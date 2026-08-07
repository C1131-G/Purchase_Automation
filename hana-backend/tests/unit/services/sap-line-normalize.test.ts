import { describe, expect, it } from "vitest";

import { normalizeSAPLineData } from "@/services/sap-line-normalize";

describe("normalizeSAPLineData", () => {
  it("returns item code and quantity from PascalCase fields", () => {
    const result = normalizeSAPLineData({
      ItemCode: "A001",
      ItemDescription: "Widget",
      Quantity: 3,
      Price: 10,
      DiscountPercent: 0,
    });

    expect(result.ItemCode).toBe("A001");
    expect(result.Quantity).toBe(3);
  });

  it("prefers PriceBefDi when discount is present", () => {
    const result = normalizeSAPLineData({
      ItemCode: "A001",
      Quantity: 1,
      Price: 90,
      PriceBefDi: 100,
      DiscountPercent: 10,
    });

    // PriceBefDi is preferred; normalized pre-discount price is exposed as Price
    expect(result.Price).toBe(100);
  });

  it("replaces Manual UoMCode with MeasureUnit (inventory unit)", () => {
    const result = normalizeSAPLineData({
      ItemCode: "A001",
      Quantity: 1,
      Price: 10,
      UoMCode: "Manual",
      UoMEntry: -1,
      MeasureUnit: "Each",
    });

    expect(result.UoMCode).toBe("Each");
  });
});
