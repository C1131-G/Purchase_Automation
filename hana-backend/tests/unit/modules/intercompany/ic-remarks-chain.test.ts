import { describe, expect, it } from "vitest";

import {
  appendIcRemarkLines,
  buildFlow1ConvertRemarks,
  buildFlow1RfqRemarks,
  buildFlow1SqRemarks,
  buildFlow2ArRemarks,
  ensureVendorRefInRemarks,
  formatIcDocLabel,
  mergeUserAndIcRemarks,
} from "@/modules/intercompany/infrastructure/ic-remarks-chain";

describe("ic-remarks-chain", () => {
  it("RFQ open remarks are PQ only with CardName (not CardCode)", () => {
    const merged = buildFlow1RfqRemarks({
      cardName: "AJAX Industries",
      existing: "Please match last quote\nUrgent for plant B",
      pqDraftDocEntry: 55,
      pqDraftDocNum: 9001,
      rfqNumber: "9001",
    });

    expect(merged).toContain("Please match last quote");
    expect(merged).toContain("Urgent for plant B");
    expect(merged).toContain("Auto Generated Based on AJAX Industries Purchase Quotation 9001");
    expect(merged).not.toContain("Request For Quotation");
    expect(merged).not.toMatch(/Flow\s*[12]/i);
    expect(merged).not.toContain("IC |");
    // Never put BP code
    expect(merged).not.toContain("V-B");
  });

  it("after RFQ submit convert remarks are PQ + RFQ with distinct numbers", () => {
    const remarks = buildFlow1ConvertRemarks({
      cardName: "AJAX Industries",
      existing: "User note",
      pqDraftDocEntry: 55,
      pqDraftDocNum: 2042,
      pqDocEntry: 55,
      pqDocNum: 2042,
      rfqId: 9,
      rfqNumber: "9001",
    });
    expect(remarks).toContain("Auto Generated Based on AJAX Industries Purchase Quotation 2042");
    expect(remarks).toContain("Auto Generated Based on AJAX Industries Request For Quotation 9001");
    expect(remarks).not.toContain("Sales Quotation");
  });

  it("mergeUserAndIcRemarks recovers parent typed text when RFQ only has IC lines", () => {
    const merged = mergeUserAndIcRemarks("IC | PQ: PQ No 1\nIC | RFQ: RFQ-1", "Parent typed on PQ");
    expect(merged).toContain("Parent typed on PQ");
    expect(merged).toContain("Auto Generated Based on Purchase Quotation 1");
    expect(merged).toContain("Auto Generated Based on Request For Quotation 1");
    expect(merged.indexOf("Parent typed on PQ")).toBeLessThan(merged.indexOf("Auto Generated"));
  });

  it("mergeUserAndIcRemarks unions user text from both sides + IC keys", () => {
    const merged = mergeUserAndIcRemarks(
      "Buyer note A\nIC | PQ: PQ No 1",
      "Seller-side note\nIC | RFQ: RFQ-1\nIC | PQ: PQ No 99",
    );

    expect(merged).toContain("Buyer note A");
    expect(merged).toContain("Seller-side note");
    // secondary wins on same IC key
    expect(merged).toContain("Auto Generated Based on Purchase Quotation 99");
    expect(merged).toContain("Auto Generated Based on Request For Quotation 1");
    expect(merged.indexOf("Buyer note A")).toBeLessThan(merged.indexOf("Auto Generated"));
  });

  it("mergeUserAndIcRemarks is idempotent when both sides already have Based on lines", () => {
    const chain =
      "Offline Sync\nAuto Generated Based on Purchase Quotation 8000590\nAuto Generated Based on Request For Quotation 8000590";
    const merged = mergeUserAndIcRemarks(chain, chain);
    expect(merged).toBe(chain);
  });

  it("buildFlow2ArRemarks keeps PO user comments and PQ+RFQ+SQ with CardName", () => {
    const comments = buildFlow2ArRemarks({
      cardName: "AJAX Industries",
      existingComments: "Ship to dock 3",
      pqDocEntry: 55,
      pqDocNum: 2042,
      rfqId: 9,
      rfqNumber: "9001",
      sqDocEntry: 810,
      sqDocNum: 810,
    });
    expect(comments).toContain("Ship to dock 3");
    expect(comments).toContain("Auto Generated Based on AJAX Industries Purchase Quotation 2042");
    expect(comments).toContain(
      "Auto Generated Based on AJAX Industries Request For Quotation 9001",
    );
    expect(comments).toContain("Auto Generated Based on AJAX Industries Sales Quotation 810");
    expect(comments).not.toContain("Purchase Order");
    expect(comments).not.toContain("AR Invoice");
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
    expect(formatIcDocLabel({ kind: "AR", docEntry: 9001 })).toBe("AR Invoice Entry 9001");
  });

  it("ensureVendorRefInRemarks adds vendor ref once without dropping parent text", () => {
    const first = ensureVendorRefInRemarks("Parent typed notes", "VR-7788");
    expect(first).toContain("Parent typed notes");
    expect(first).toContain("Vendor Ref No: VR-7788");
    const second = ensureVendorRefInRemarks(first, "VR-7788");
    expect(second).toBe(first);
  });

  it("buildFlow1SqRemarks is PQ + RFQ only (two details) with CardName", () => {
    const remarks = buildFlow1SqRemarks({
      cardName: "AJAX Industries",
      existing: "Ship ASAP",
      pqDraftDocEntry: 55,
      pqDraftDocNum: 9001,
      pqDocEntry: 2042,
      pqDocNum: 2042,
      rfqId: 9,
      rfqNumber: "9001",
      sqDocEntry: 810,
      sqDocNum: 810,
      vendorRefNo: "BUYER-REF-42",
    });
    expect(remarks).toContain("Ship ASAP");
    expect(remarks).toContain("Vendor Ref No: BUYER-REF-42");
    expect(remarks).toContain("Auto Generated Based on AJAX Industries Purchase Quotation 2042");
    expect(remarks).toContain("Auto Generated Based on AJAX Industries Request For Quotation 9001");
    // SQ does not self-link even when sqDocEntry is passed.
    expect(remarks).not.toContain("Sales Quotation");
    expect(remarks).not.toContain("Purchase Quotation Draft");
    expect(remarks.indexOf("Ship ASAP")).toBeLessThan(remarks.indexOf("Auto Generated"));
    expect(remarks.indexOf("Vendor Ref No")).toBeLessThan(remarks.indexOf("Auto Generated"));
  });

  it("parses multi-word CardName Based on lines for merge/idempotency", () => {
    const first = appendIcRemarkLines("Note", [
      { cardName: "AJAX Industries", key: "PQ", text: "132424" },
    ]);
    expect(first).toBe("Note\nAuto Generated Based on AJAX Industries Purchase Quotation 132424");
    const second = appendIcRemarkLines(first, [
      { cardName: "AJAX Industries", key: "PQ", text: "999" },
    ]);
    expect(second).toBe(first);
  });
});
