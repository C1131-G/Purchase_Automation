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
    expect(formatSeriesDisplay("Primary", 240001, 72)).toBe("Primary · 240001");
    expect(formatSeriesDisplay("Primary", 240010, 72)).toBe("Primary · 240010");
    expect(formatSeriesDisplay("", null, 72)).toBe("Series 72");
    expect(toPositiveSeries("18")).toBe(18);
  });

  it("suggests the series whose Remarks equals the warehouse's store location", () => {
    const items = [
      { code: "12", name: "PO-SUV", location: "Suva", nextNumber: 100 },
      { code: "11", name: "PO-LAB", location: "  LABASA ", nextNumber: 200 },
    ];
    expect(suggestSeries(items, "Labasa")?.code).toBe("11");
    expect(suggestSeries(items, "suva")?.code).toBe("12");
  });

  it("suggests nothing when no series Remarks matches the store location", () => {
    const items = [
      { code: "12", name: "PO-SUV", location: "Suva", nextNumber: 100 },
      { code: "13", name: "Primary", location: null, nextNumber: 300 },
    ];
    expect(suggestSeries(items, "Nadi")).toBeNull();
    expect(suggestSeries(items, null)).toBeNull();
    expect(suggestSeries([], "Suva")).toBeNull();
  });

  it("auto-selects only exact codes and complete formatted displays", () => {
    const items = [
      { code: "10", name: "Main", branchId: 1, nextNumber: 100 },
      { code: "20", name: "RCM", branchId: 7, nextNumber: 200 },
    ];

    expect(findSeriesSelection(items, "10")).toEqual(items[0]);
    expect(findSeriesSelection(items, "Main · 100")).toEqual(items[0]);
    expect(findSeriesSelection(items, "main")).toBeUndefined();
    expect(findSeriesSelection(items, "100")).toBeUndefined();
    expect(findSeriesSelection(items, "main · 100")).toEqual(items[0]);
  });
});
