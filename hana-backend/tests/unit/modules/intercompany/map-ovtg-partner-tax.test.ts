import { describe, expect, it } from "vitest";

import {
  mapTaxCodeByOvtgRate,
  OVTG_CATEGORY_PURCHASE,
  OVTG_CATEGORY_SALES,
} from "@/modules/intercompany/config/tax-mapping/map-ovtg-partner-tax";

describe("mapTaxCodeByOvtgRate", () => {
  it("maps buyer purchase tax rate to seller sales tax (PQ→SQ)", () => {
    const mapped = mapTaxCodeByOvtgRate({
      sourceTax: { category: OVTG_CATEGORY_PURCHASE, code: "IN-12.5", rate: 12.5 },
      targetDocSide: "sales",
      targetTaxes: [
        { category: OVTG_CATEGORY_SALES, code: "OUT-12.5", rate: 12.5 },
        { category: OVTG_CATEGORY_PURCHASE, code: "IN-12.5", rate: 12.5 },
      ],
    });

    expect(mapped).toBe("OUT-12.5");
  });

  it("maps seller sales tax rate to buyer purchase tax (reverse)", () => {
    const mapped = mapTaxCodeByOvtgRate({
      sourceTax: { category: OVTG_CATEGORY_SALES, code: "OUT-18", rate: 18 },
      targetDocSide: "purchase",
      targetTaxes: [
        { category: OVTG_CATEGORY_PURCHASE, code: "IN-18", rate: 18 },
        { category: OVTG_CATEGORY_SALES, code: "OUT-18", rate: 18 },
      ],
    });

    expect(mapped).toBe("IN-18");
  });

  it("returns null when no matching target rate", () => {
    const mapped = mapTaxCodeByOvtgRate({
      sourceTax: { category: OVTG_CATEGORY_PURCHASE, code: "IN-12.5", rate: 12.5 },
      targetDocSide: "sales",
      targetTaxes: [{ category: OVTG_CATEGORY_SALES, code: "OUT-5", rate: 5 }],
    });

    expect(mapped).toBeNull();
  });
});
