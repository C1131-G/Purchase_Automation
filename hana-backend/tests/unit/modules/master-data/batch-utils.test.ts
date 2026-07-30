import { describe, expect, it } from "vitest";

import {
  MAX_MASTER_DATA_BATCH_CODES,
  parseItemCodesParam,
} from "@/modules/master-data/master-data.batch-utils";

describe("parseItemCodesParam", () => {
  it("returns empty for missing or blank input", () => {
    expect(parseItemCodesParam(undefined)).toEqual([]);
    expect(parseItemCodesParam(null)).toEqual([]);
    expect(parseItemCodesParam("")).toEqual([]);
    expect(parseItemCodesParam("   ")).toEqual([]);
    expect(parseItemCodesParam(12)).toEqual([]);
  });

  it("splits, trims, and dedupes codes", () => {
    expect(parseItemCodesParam(" A ,B, A , ,C ")).toEqual(["A", "B", "C"]);
  });

  it("caps at MAX_MASTER_DATA_BATCH_CODES", () => {
    const many = Array.from({ length: MAX_MASTER_DATA_BATCH_CODES + 25 }, (_, i) => `C${i}`).join(
      ",",
    );
    const parsed = parseItemCodesParam(many);
    expect(parsed).toHaveLength(MAX_MASTER_DATA_BATCH_CODES);
    expect(parsed[0]).toBe("C0");
    expect(parsed.at(-1)).toBe(`C${MAX_MASTER_DATA_BATCH_CODES - 1}`);
  });
});
