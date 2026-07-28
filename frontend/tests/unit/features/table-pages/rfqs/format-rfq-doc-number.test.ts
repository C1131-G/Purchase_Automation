import { describe, expect, it } from "vitest";

import { formatRfqDocNumber } from "@/features/table-pages/rfqs/utils/format-rfq-doc-number";

describe("formatRfqDocNumber", () => {
  it("returns plain numeric rfq numbers as-is", () => {
    expect(formatRfqDocNumber("8000590")).toBe("8000590");
  });

  it("strips legacy RFQ-PQD- prefix", () => {
    expect(formatRfqDocNumber("RFQ-PQD-8000590")).toBe("8000590");
    expect(formatRfqDocNumber("RFQ-PQD-E95")).toBe("95");
  });

  it("returns em dash for empty values", () => {
    expect(formatRfqDocNumber("")).toBe("—");
    expect(formatRfqDocNumber(null)).toBe("—");
  });
});
