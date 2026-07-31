import { describe, expect, it } from "vitest";

import {
  buildMirrorTaxCodeCandidates,
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

  it("prefers OUT-12.5 mirror over GSTO/RCM at same rate (AJAX PO→AR)", () => {
    const mapped = mapTaxCodeByOvtgRate({
      sourceTax: { category: OVTG_CATEGORY_PURCHASE, code: "IN-12.5", rate: 12.5 },
      targetDocSide: "sales",
      // GSTO first in DB order — old .find() would wrongly pick it.
      targetTaxes: [
        { category: OVTG_CATEGORY_SALES, code: "GSTO", rate: 12.5 },
        { category: OVTG_CATEGORY_SALES, code: "RCM-OUT-12.5", rate: 12.5 },
        { category: OVTG_CATEGORY_SALES, code: "OUT-12.5", rate: 12.5 },
        { category: OVTG_CATEGORY_PURCHASE, code: "IN-12.5", rate: 12.5 },
      ],
    });

    expect(mapped).toBe("OUT-12.5");
  });

  it("prefers OUT-12.5 when source is RCM purchase code at 12.5", () => {
    const mapped = mapTaxCodeByOvtgRate({
      sourceTax: { category: OVTG_CATEGORY_PURCHASE, code: "RCM-IN-12.5", rate: 12.5 },
      targetDocSide: "sales",
      targetTaxes: [
        { category: OVTG_CATEGORY_SALES, code: "GSTO", rate: 12.5 },
        { category: OVTG_CATEGORY_SALES, code: "OUT-12.5", rate: 12.5 },
      ],
    });

    expect(mapped).toBe("OUT-12.5");
  });

  it("falls back to only sales rate match when no OUT/IN pair exists", () => {
    const mapped = mapTaxCodeByOvtgRate({
      sourceTax: { category: OVTG_CATEGORY_PURCHASE, code: "IN-12.5", rate: 12.5 },
      targetDocSide: "sales",
      targetTaxes: [{ category: OVTG_CATEGORY_SALES, code: "GSTO", rate: 12.5 }],
    });

    expect(mapped).toBe("GSTO");
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

describe("buildMirrorTaxCodeCandidates", () => {
  it("builds OUT variants from IN-12.5 for sales docs", () => {
    const mirrors = buildMirrorTaxCodeCandidates("IN-12.5", "sales");
    expect(mirrors.map((c) => c.toUpperCase())).toEqual(
      expect.arrayContaining(["IN-12.5", "OUT-12.5"]),
    );
  });

  it("builds IN variants from OUT-18 for purchase docs", () => {
    const mirrors = buildMirrorTaxCodeCandidates("OUT-18", "purchase");
    expect(mirrors.map((c) => c.toUpperCase())).toEqual(
      expect.arrayContaining(["OUT-18", "IN-18"]),
    );
  });
});
