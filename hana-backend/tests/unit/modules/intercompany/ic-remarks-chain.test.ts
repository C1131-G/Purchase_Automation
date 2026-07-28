import { describe, expect, it } from "vitest";

import {
  appendIcRemarkLines,
  buildFlow1RfqRemarks,
  buildFlow1SqRemarks,
  buildFlow2ArRemarks,
  ensureVendorRefInRemarks,
  formatIcDocLabel,
  mergeUserAndIcRemarks,
} from "@/modules/intercompany/infrastructure/ic-remarks-chain";

describe("ic-remarks-chain", () => {
  it("never drops original user remarks when appending IC lines", () => {
    const merged = buildFlow1RfqRemarks({
      existing: "Please match last quote\nUrgent for plant B",
      pqDraftDocEntry: 55,
      pqDraftDocNum: 9001,
      rfqNumber: "9001",
    });

    expect(merged).toContain("Please match last quote");
    expect(merged).toContain("Urgent for plant B");
    expect(merged).toContain("Based on Purchase Quotation Draft 9001");
    expect(merged).toContain("Based on Request For Quotation 9001");
    expect(merged).not.toMatch(/Flow\s*[12]/i);
    expect(merged).not.toContain("IC |");
  });

  it("mergeUserAndIcRemarks recovers parent typed text when RFQ only has IC lines", () => {
    const merged = mergeUserAndIcRemarks(
      "IC | PQD: PQ Draft No 1\nIC | RFQ: RFQ-1",
      "Parent typed on PQ draft",
    );
    expect(merged).toContain("Parent typed on PQ draft");
    expect(merged).toContain("Based on Purchase Quotation Draft 1");
    expect(merged).toContain("Based on Request For Quotation 1");
    expect(merged.indexOf("Parent typed on PQ draft")).toBeLessThan(merged.indexOf("Based on"));
  });

  it("mergeUserAndIcRemarks unions user text from both sides + IC keys", () => {
    const merged = mergeUserAndIcRemarks(
      "Buyer note A\nIC | PQD: PQ Draft No 1",
      "Seller-side note\nIC | RFQ: RFQ-1\nIC | PQD: PQ Draft No 99",
    );

    expect(merged).toContain("Buyer note A");
    expect(merged).toContain("Seller-side note");
    // secondary wins on same IC key
    expect(merged).toContain("Based on Purchase Quotation Draft 99");
    expect(merged).toContain("Based on Request For Quotation 1");
    expect(merged.indexOf("Buyer note A")).toBeLessThan(merged.indexOf("Based on"));
  });

  it("mergeUserAndIcRemarks is idempotent when both sides already have Based on lines", () => {
    const chain =
      "Offline Sync\nBased on Purchase Quotation Draft 8000590\nBased on Request For Quotation 8000590";
    const merged = mergeUserAndIcRemarks(chain, chain);
    expect(merged).toBe(chain);
  });

  it("buildFlow2ArRemarks keeps PO user comments", () => {
    const comments = buildFlow2ArRemarks({
      existingComments: "Ship to dock 3",
      poDocEntry: 88,
      poDocNum: 188,
    });
    expect(comments).toBe("Ship to dock 3\nBased on Purchase Order 188");
  });

  it("appendIcRemarkLines is idempotent for existing keys", () => {
    const first = appendIcRemarkLines("User text", [{ key: "PO", text: "1" }]);
    const second = appendIcRemarkLines(first, [{ key: "PO", text: "999" }]);
    expect(second).toBe(first);
    expect(second).toContain("User text");
  });

  it("formatIcDocLabel prefers document numbers", () => {
    expect(formatIcDocLabel({ kind: "PO", docNum: 188, docEntry: 88 })).toBe("PO No 188");
    expect(formatIcDocLabel({ kind: "RFQ", rfqNumber: "9001" })).toBe("RFQ 9001");
    expect(formatIcDocLabel({ kind: "AR", docEntry: 9001 })).toBe("AR Invoice Draft Entry 9001");
  });

  it("ensureVendorRefInRemarks adds vendor ref once without dropping parent text", () => {
    const first = ensureVendorRefInRemarks("Parent typed notes", "VR-7788");
    expect(first).toContain("Parent typed notes");
    expect(first).toContain("Vendor Ref No: VR-7788");
    const second = ensureVendorRefInRemarks(first, "VR-7788");
    expect(second).toBe(first);
  });

  it("buildFlow1SqRemarks includes vendor ref + IC chain", () => {
    const remarks = buildFlow1SqRemarks({
      existing: "Ship ASAP",
      pqDraftDocEntry: 55,
      pqDraftDocNum: 9001,
      pqDocEntry: 2042,
      pqDocNum: 2042,
      rfqId: 9,
      rfqNumber: "9001",
      vendorRefNo: "BUYER-REF-42",
    });
    expect(remarks).toContain("Ship ASAP");
    expect(remarks).toContain("Vendor Ref No: BUYER-REF-42");
    expect(remarks).toContain("Based on Purchase Quotation Draft 9001");
    expect(remarks).toContain("Based on Request For Quotation 9001");
    expect(remarks).toContain("Based on Purchase Quotation 2042");
    expect(remarks.indexOf("Ship ASAP")).toBeLessThan(remarks.indexOf("Based on"));
    expect(remarks.indexOf("Vendor Ref No")).toBeLessThan(remarks.indexOf("Based on"));
  });
});
