import { describe, expect, it } from "vitest";

import {
  appendIcRemarkLines,
  buildFlow1RfqRemarks,
  buildFlow2ArRemarks,
  formatIcDocLabel,
  mergeUserAndIcRemarks,
} from "@/modules/intercompany/infrastructure/ic-remarks-chain";

describe("ic-remarks-chain", () => {
  it("never drops original user remarks when appending IC lines", () => {
    const merged = buildFlow1RfqRemarks({
      existing: "Please match last quote\nUrgent for plant B",
      pqDraftDocEntry: 55,
      pqDraftDocNum: 9001,
      rfqNumber: "RFQ-PQD-9001",
    });

    expect(merged).toContain("Please match last quote");
    expect(merged).toContain("Urgent for plant B");
    expect(merged).toContain("IC | PQD: PQ Draft No 9001");
    expect(merged).toContain("IC | RFQ: RFQ-PQD-9001");
    expect(merged).not.toMatch(/Flow\s*[12]/i);
  });

  it("mergeUserAndIcRemarks recovers parent typed text when RFQ only has IC lines", () => {
    const merged = mergeUserAndIcRemarks(
      "IC | PQD: PQ Draft No 1\nIC | RFQ: RFQ-1",
      "Parent typed on PQ draft",
    );
    expect(merged).toContain("Parent typed on PQ draft");
    expect(merged).toContain("IC | PQD: PQ Draft No 1");
    expect(merged).toContain("IC | RFQ: RFQ-1");
    expect(merged.indexOf("Parent typed on PQ draft")).toBeLessThan(merged.indexOf("IC |"));
  });

  it("mergeUserAndIcRemarks unions user text from both sides + IC keys", () => {
    const merged = mergeUserAndIcRemarks(
      "Buyer note A\nIC | PQD: PQ Draft No 1",
      "Seller-side note\nIC | RFQ: RFQ-1\nIC | PQD: PQ Draft No 99",
    );

    expect(merged).toContain("Buyer note A");
    expect(merged).toContain("Seller-side note");
    // secondary wins on same IC key
    expect(merged).toContain("IC | PQD: PQ Draft No 99");
    expect(merged).toContain("IC | RFQ: RFQ-1");
    expect(merged.indexOf("Buyer note A")).toBeLessThan(merged.indexOf("IC |"));
  });

  it("buildFlow2ArRemarks keeps PO user comments", () => {
    const comments = buildFlow2ArRemarks({
      existingComments: "Ship to dock 3",
      poDocEntry: 88,
      poDocNum: 188,
    });
    expect(comments).toBe("Ship to dock 3\nIC | PO: PO No 188");
  });

  it("appendIcRemarkLines is idempotent for existing keys", () => {
    const first = appendIcRemarkLines("User text", [{ key: "PO", text: "PO No 1" }]);
    const second = appendIcRemarkLines(first, [{ key: "PO", text: "PO No 999" }]);
    expect(second).toBe(first);
    expect(second).toContain("User text");
  });

  it("formatIcDocLabel prefers document numbers", () => {
    expect(formatIcDocLabel({ kind: "PO", docNum: 188, docEntry: 88 })).toBe("PO No 188");
    expect(formatIcDocLabel({ kind: "RFQ", rfqNumber: "RFQ-PQD-9001" })).toBe("RFQ RFQ-PQD-9001");
    expect(formatIcDocLabel({ kind: "AR", docEntry: 9001 })).toBe("AR Invoice Draft Entry 9001");
  });
});
