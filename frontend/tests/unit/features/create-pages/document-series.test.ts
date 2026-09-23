import { describe, expect, it } from "vitest";

import {
  documentSeriesPayload,
  findSeriesSelection,
  formatSeriesDisplay,
  suggestSeries,
  toPositiveSeries,
} from "@/features/create-pages/create-shared/utils/document-series";

describe("document-series helpers", () => {
  it("returns empty payload when no series", () => {
    expect(documentSeriesPayload(null)).toEqual({});
    expect(documentSeriesPayload(0)).toEqual({});
  });

  it("returns Series when set", () => {
    expect(documentSeriesPayload(72)).toEqual({ Series: 72 });
  });

  it("formats series name with next number", () => {
    expect(formatSeriesDisplay("Primary", 240001, 72)).toBe("Primary · Series 72 · Next 240001");
    expect(formatSeriesDisplay("Primary", 240010, 72)).toBe("Primary · Series 72 · Next 240010");
    expect(formatSeriesDisplay("", null, 72)).toBe("Series 72");
    expect(toPositiveSeries("18")).toBe(18);
  });

  it("suggests the series matching the warehouse's SAP location and the document branch", () => {
    const items = [
      { code: "12", name: "PO-SUV", location: "Suva", branchId: 1, nextNumber: 100 },
      { code: "11", name: "PO-LAB", location: "  LABASA ", branchId: 2, nextNumber: 200 },
      { code: "14", name: "PO-LAB-B1", location: "Labasa", branchId: 1, nextNumber: 400 },
    ];
    expect(suggestSeries(items, "Labasa", 2)?.code).toBe("11");
    expect(suggestSeries(items, "labasa", 1)?.code).toBe("14");
    expect(suggestSeries(items, "suva", 1)?.code).toBe("12");
  });

  it("suggests nothing unless both warehouse location and branch match", () => {
    const items = [
      { code: "12", name: "PO-SUV", location: "Suva", branchId: 1, nextNumber: 100 },
      { code: "13", name: "Primary", location: null, branchId: 2, nextNumber: 300 },
    ];
    expect(suggestSeries(items, "Suva", 2)).toBeNull();
    expect(suggestSeries(items, "Suva", null)).toBeNull();
    expect(suggestSeries(items, "Nadi", 1)).toBeNull();
    expect(suggestSeries(items, null, 2)).toBeNull();
    expect(suggestSeries([], "Suva", 1)).toBeNull();
  });

  it("auto-selects only exact codes and complete formatted displays", () => {
    const items = [
      { code: "10", name: "Main", branchId: 1, nextNumber: 100 },
      { code: "20", name: "RCM", branchId: 7, nextNumber: 200 },
    ];

    expect(findSeriesSelection(items, "10")).toEqual(items[0]);
    expect(findSeriesSelection(items, "Main · Series 10 · Next 100")).toEqual(items[0]);
    expect(findSeriesSelection(items, "main")).toBeUndefined();
    expect(findSeriesSelection(items, "100")).toBeUndefined();
    expect(findSeriesSelection(items, "main · Series 10 · Next 100")).toEqual(items[0]);
  });
});
