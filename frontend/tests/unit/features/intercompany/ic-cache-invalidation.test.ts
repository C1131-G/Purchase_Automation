import { describe, expect, it } from "vitest";

import {
  isIcRfqConvertInFlight,
  isIcRfqConvertTerminal,
} from "@/features/intercompany/api/ic-cache-invalidation";

import { IC_REVISION_POLL_MS as WATCHER_POLL_MS } from "@/features/intercompany/api/intercompany.queries";

describe("IC revision polling contract", () => {
  it("uses the agreed three-second active-tab interval", () => {
    expect(WATCHER_POLL_MS).toBe(3_000);
  });
});

describe("isIcRfqConvertInFlight", () => {
  it("is true only for SUBMITTED", () => {
    expect(isIcRfqConvertInFlight("SUBMITTED")).toBe(true);
    expect(isIcRfqConvertInFlight("submitted")).toBe(true);
    expect(isIcRfqConvertInFlight(" DRAFT ")).toBe(false);
    expect(isIcRfqConvertInFlight("COMPLETED")).toBe(false);
    expect(isIcRfqConvertInFlight(null)).toBe(false);
    expect(isIcRfqConvertInFlight(undefined)).toBe(false);
  });
});

describe("isIcRfqConvertTerminal", () => {
  it("is true for COMPLETED and CANCELLED", () => {
    expect(isIcRfqConvertTerminal("COMPLETED")).toBe(true);
    expect(isIcRfqConvertTerminal("cancelled")).toBe(true);
    expect(isIcRfqConvertTerminal("SUBMITTED")).toBe(false);
    expect(isIcRfqConvertTerminal("DRAFT")).toBe(false);
  });
});
