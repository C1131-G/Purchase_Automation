import { describe, expect, it } from "vitest";

import {
  documentSeriesPayload,
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
    expect(formatSeriesDisplay("", null, 72)).toBe("Series 72");
    expect(toPositiveSeries("18")).toBe(18);
  });

  it("suggests branch series when present, otherwise first", () => {
    const items = [
      { code: "10", name: "Main", branchId: 1, nextNumber: 100 },
      { code: "20", name: "RCM", branchId: 7, nextNumber: 200 },
    ];
    expect(suggestSeries(items, 7)?.code).toBe("20");
    expect(suggestSeries(items, 9)?.code).toBe("10");
    expect(suggestSeries([], 1)).toBeNull();
  });
});
