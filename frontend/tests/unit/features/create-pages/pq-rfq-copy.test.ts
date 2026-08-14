import { describe, expect, it } from "vitest";

import { isPqRfqCopyAllowed } from "@/features/create-pages/create-shared/utils/pq-rfq-copy";

describe("isPqRfqCopyAllowed", () => {
  it("allows only PQs the API marked copyable after RFQ submit", () => {
    expect(isPqRfqCopyAllowed({ rfqCopyAllowed: true })).toBe(true);
    expect(isPqRfqCopyAllowed({ rfqCopyAllowed: false })).toBe(false);
    expect(isPqRfqCopyAllowed({})).toBe(false);
    expect(isPqRfqCopyAllowed(null)).toBe(false);
    expect(isPqRfqCopyAllowed(undefined)).toBe(false);
  });
});
