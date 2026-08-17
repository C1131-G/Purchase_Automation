import { describe, expect, it } from "vitest";

import {
  isPqLockedAfterRfqSubmit,
  isPqRfqCopyAllowed,
  PQ_RFQ_LOCKED_MESSAGE,
} from "@/features/create-pages/create-shared/utils/pq-rfq-copy";

describe("isPqRfqCopyAllowed", () => {
  it("allows only PQs the API marked copyable after RFQ submit", () => {
    expect(isPqRfqCopyAllowed({ rfqCopyAllowed: true })).toBe(true);
    expect(isPqRfqCopyAllowed({ rfqCopyAllowed: false })).toBe(false);
    expect(isPqRfqCopyAllowed({})).toBe(false);
    expect(isPqRfqCopyAllowed(null)).toBe(false);
    expect(isPqRfqCopyAllowed(undefined)).toBe(false);
  });
});

describe("isPqLockedAfterRfqSubmit", () => {
  it("locks the PQ after RFQ submit or complete", () => {
    expect(isPqLockedAfterRfqSubmit("SUBMITTED")).toBe(true);
    expect(isPqLockedAfterRfqSubmit("completed")).toBe(true);
    expect(isPqLockedAfterRfqSubmit("DRAFT")).toBe(false);
    expect(isPqLockedAfterRfqSubmit("CANCELLED")).toBe(false);
    expect(isPqLockedAfterRfqSubmit(null)).toBe(false);
    expect(isPqLockedAfterRfqSubmit(undefined)).toBe(false);
  });

  it("tells the buyer the RFQ is submitted and the PQ cannot be edited", () => {
    expect(PQ_RFQ_LOCKED_MESSAGE).toBe("RFQ submitted, can't edit");
  });
});
