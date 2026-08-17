import { describe, expect, it } from "vitest";

import { pickSapSeries } from "@/modules/master-data/document-series";

describe("pickSapSeries", () => {
  it("returns a positive Series from a Service Layer document", () => {
    expect(pickSapSeries({ Series: 72 })).toBe(72);
    expect(pickSapSeries({ Series: "18" })).toBe(18);
  });

  it("returns undefined when Series is missing or invalid", () => {
    expect(pickSapSeries(null)).toBeUndefined();
    expect(pickSapSeries({})).toBeUndefined();
    expect(pickSapSeries({ Series: 0 })).toBeUndefined();
    expect(pickSapSeries({ Series: "x" })).toBeUndefined();
  });
});
