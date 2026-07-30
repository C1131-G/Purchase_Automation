import { describe, expect, it } from "vitest";

import {
  INLINE_SUGGESTION_LIMIT,
  limitInlineSuggestions,
  rankAndLimitLookupOptions,
  rankLookupOptions,
} from "@/features/create-pages/create-shared/utils/rank-lookup-options";

const item = (code: string, name = code) => ({ code, name });

describe("rankLookupOptions", () => {
  it("ranks exact match before prefix and contains", () => {
    const items = [item("ABC-100", "Widget"), item("AB", "Exactish"), item("ZAB", "Contains AB")];
    const ranked = rankLookupOptions(items, "ab");
    expect(ranked[0]?.code).toBe("AB");
    expect(ranked.map((row) => row.code)).toContain("ABC-100");
  });

  it("returns a copy when search is empty", () => {
    const items = [item("B"), item("A")];
    const ranked = rankLookupOptions(items, "  ");
    expect(ranked).toEqual(items);
    expect(ranked).not.toBe(items);
  });
});

describe("limitInlineSuggestions", () => {
  it("caps to INLINE_SUGGESTION_LIMIT by default", () => {
    const items = Array.from({ length: INLINE_SUGGESTION_LIMIT + 15 }, (_, i) => item(`C${i}`));
    expect(limitInlineSuggestions(items)).toHaveLength(INLINE_SUGGESTION_LIMIT);
  });

  it("returns all items when under the limit", () => {
    const items = [item("A"), item("B")];
    expect(limitInlineSuggestions(items)).toEqual(items);
  });
});

describe("rankAndLimitLookupOptions", () => {
  it("ranks then caps", () => {
    const items = Array.from({ length: 30 }, (_, i) => item(`V${String(i).padStart(2, "0")}`));
    const result = rankAndLimitLookupOptions(items, "v0", 5);
    expect(result).toHaveLength(5);
    expect(result[0]?.code).toBe("V00");
  });
});
