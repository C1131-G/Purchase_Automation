import { describe, expect, it } from "vitest";

import {
  getPqDefaultDates,
  getPqRequiredDateMax,
  getPqValidUntilMin,
} from "@/features/create-pages/purchase-quotation-create/utils/pq-create.utils";

describe("PQ date rules", () => {
  it("defaults Required Date one month after today and Valid Until two days later", () => {
    expect(getPqDefaultDates("2026-08-27")).toEqual({
      requiredDate: "2026-09-27",
      validUntil: "2026-09-29",
    });
  });

  it("clamps one-month defaults at month end", () => {
    expect(getPqDefaultDates("2026-01-31")).toEqual({
      requiredDate: "2026-02-28",
      validUntil: "2026-03-02",
    });
    expect(getPqDefaultDates("2028-01-31")).toEqual({
      requiredDate: "2028-02-29",
      validUntil: "2028-03-02",
    });
  });

  it("keeps Required Date two days below Valid Until", () => {
    expect(getPqRequiredDateMax("2026-09-29")).toBe("2026-09-27");
    expect(getPqValidUntilMin("2026-09-27", ["2026-09-26", "2026-09-25"])).toBe("2026-09-29");
  });
});
