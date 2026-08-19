import { describe, expect, it } from "vitest";

import { capIsoDateToMax } from "@/features/create-pages/create-shared/utils/create-order.utils";

describe("capIsoDateToMax", () => {
  it("keeps a date on or before the max", () => {
    expect(capIsoDateToMax("2026-06-10", "2026-06-15")).toBe("2026-06-10");
    expect(capIsoDateToMax("2026-06-15", "2026-06-15")).toBe("2026-06-15");
  });

  it("clamps a date after the max to the max", () => {
    expect(capIsoDateToMax("2026-06-20", "2026-06-15")).toBe("2026-06-15");
  });

  it("returns the value when max is empty", () => {
    expect(capIsoDateToMax("2026-06-20", "")).toBe("2026-06-20");
    expect(capIsoDateToMax("2026-06-20", undefined)).toBe("2026-06-20");
  });

  it("returns empty when the value is empty", () => {
    expect(capIsoDateToMax("", "2026-06-15")).toBe("");
    expect(capIsoDateToMax(undefined, "2026-06-15")).toBe("");
  });
});
