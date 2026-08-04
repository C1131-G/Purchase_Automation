import { describe, expect, it } from "vitest";

import {
  appendIcRemarkLines,
  buildFlow1ConvertRemarks,
  buildFlow1RfqRemarks,
  buildFlow1SqRemarks,
  buildFlow2ArRemarks,
  clampSapDocumentComments,
  ensureVendorRefInRemarks,
  formatIcDocLabel,
  mergeUserAndIcRemarks,
} from "@/modules/intercompany/infrastructure/ic-remarks-chain";

describe("ic-remarks-chain", () => {
  it("RFQ open remarks are PQ only (short)", () => {
    const merged = buildFlow1RfqRemarks({
      buyerCompanyName: "AJAX Industries",
      sellerCompanyName: "RCM Trading",
      existing: "Please match last quote\nUrgent for plant B",
      pqDraftDocEntry: 55,
      pqDraftDocNum: 9001,
      rfqNumber: "9001",
    });

    expect(merged).toContain("Please match last quote");
    expect(merged).toContain("Urgent for plant B");
    expect(merged).toContain("PQ 9001");
    expect(merged).not.toContain("Auto Generated");
    expect(merged).not.toContain("AJAX Industries");
    expect(merged).not.toContain("Request For Quotation");
    expect(merged).not.toMatch(/Flow\s*[12]/i);
    expect(merged).not.toContain("IC |");
    expect(merged).not.toContain("V-B");
  });

  it("after RFQ submit convert remarks are PQ + RFQ (short)", () => {
    const remarks = buildFlow1ConvertRemarks({
      buyerCompanyName: "AJAX Industries",
      sellerCompanyName: "RCM Trading",
      existing: "User note",
      pqDraftDocEntry: 55,
      pqDraftDocNum: 2042,
      pqDocEntry: 55,
      pqDocNum: 2042,
      rfqId: 9,
      rfqNumber: "9001",
    });
    expect(remarks).toContain("PQ 2042");
    expect(remarks).toContain("RFQ 9001");
    expect(remarks).not.toContain("Auto Generated");
    expect(remarks).not.toContain("Sales Quotation");
  });

  it("mergeUserAndIcRemarks recovers parent typed text when RFQ only has IC lines", () => {
    const merged = mergeUserAndIcRemarks("IC | PQ: PQ No 1\nIC | RFQ: RFQ-1", "Parent typed on PQ");
    expect(merged).toContain("Parent typed on PQ");
    expect(merged).toContain("PQ 1");
    expect(merged).toContain("RFQ 1");
    expect(merged.indexOf("Parent typed on PQ")).toBeLessThan(merged.indexOf("PQ 1"));
  });

  it("mergeUserAndIcRemarks unions user text from both sides + IC keys", () => {
    const merged = mergeUserAndIcRemarks(
      "Buyer note A\nIC | PQ: PQ No 1",
      "Seller-side note\nIC | RFQ: RFQ-1\nIC | PQ: PQ No 99",
    );

    expect(merged).toContain("Buyer note A");
    expect(merged).toContain("Seller-side note");
    // secondary wins on same IC key
    expect(merged).toContain("PQ 99");
    expect(merged).toContain("RFQ 1");
    expect(merged.indexOf("Buyer note A")).toBeLessThan(merged.indexOf("PQ 99"));
  });

  it("mergeUserAndIcRemarks normalizes legacy Based on lines to short form", () => {
    const chain =
      "Offline Sync\nAuto Generated Based on Purchase Quotation 8000590\nAuto Generated Based on Request For Quotation 8000590";
    const merged = mergeUserAndIcRemarks(chain, chain);
    expect(merged).toBe("Offline Sync\nPQ 8000590\nRFQ 8000590");
  });

  it("buildFlow2ArRemarks keeps PO user comments and PQ + RFQ + SQ short lines", () => {
    const comments = buildFlow2ArRemarks({
      buyerCompanyName: "AJAX Industries",
      sellerCompanyName: "RCM Trading",
      existingComments: "Ship to dock 3",
      pqDocEntry: 55,
      pqDocNum: 2042,
      rfqId: 9,
      rfqNumber: "9001",
      sqDocEntry: 810,
      sqDocNum: 810,
    });
    expect(comments).toContain("Ship to dock 3");
    expect(comments).toBe("Ship to dock 3\nPQ 2042\nRFQ 9001\nSQ 810");
    expect(comments).not.toContain("Auto Generated");
    expect(comments).not.toContain("Purchase Order");
    expect(comments).not.toContain("AR Invoice");
  });

  it("clampSapDocumentComments keeps IC chain and fits SAP 254 limit", () => {
    const longUser = `User notes ${"x".repeat(220)}`;
    const full = buildFlow2ArRemarks({
      buyerCompanyName: "AJAX Industries Very Long Company Name",
      sellerCompanyName: "RCM Trading Very Long Seller Name",
      existingComments: longUser,
      pqDocEntry: 55,
      pqDocNum: 8000603,
      rfqId: 9,
      rfqNumber: "8000603",
      sqDocEntry: 203465,
      sqDocNum: 203465,
    });
    // Short IC lines still leave room; pad user further if needed for clamp path
    const over = `${full}\nextra ${"y".repeat(40)}`;
    expect(over.length).toBeGreaterThan(254);
    const clamped = clampSapDocumentComments(over);
    expect(clamped.length).toBeLessThanOrEqual(254);
    expect(clamped).toMatch(/\bPQ\b|\bRFQ\b|\bSQ\b/);
  });

  it("appendIcRemarkLines is idempotent for existing keys", () => {
    const first = appendIcRemarkLines("User text", [{ key: "PO", text: "1" }]);
    const second = appendIcRemarkLines(first, [{ key: "PO", text: "999" }]);
    expect(second).toBe(first);
    expect(second).toContain("User text");
    expect(first).toBe("User text\nPO 1");
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

  it("buildFlow1SqRemarks is PQ + RFQ only (two short lines)", () => {
    const remarks = buildFlow1SqRemarks({
      buyerCompanyName: "AJAX Industries",
      sellerCompanyName: "RCM Trading",
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
    expect(remarks).toContain("PQ 2042");
    expect(remarks).toContain("RFQ 9001");
    // SQ does not self-link even when sqDocEntry is passed.
    expect(remarks).not.toContain("SQ ");
    expect(remarks).not.toContain("Auto Generated");
    expect(remarks.indexOf("Ship ASAP")).toBeLessThan(remarks.indexOf("PQ 2042"));
    expect(remarks.indexOf("Vendor Ref No")).toBeLessThan(remarks.indexOf("PQ 2042"));
  });

  it("parses multi-word company name legacy Based on lines for merge/idempotency", () => {
    const first = appendIcRemarkLines("Note", [
      { cardName: "AJAX Industries", key: "PQ", text: "132424" },
    ]);
    expect(first).toBe("Note\nPQ 132424");
    const second = appendIcRemarkLines(first, [
      { cardName: "AJAX Industries", key: "PQ", text: "999" },
    ]);
    expect(second).toBe(first);
  });

  it("does not re-append short key when legacy long line already has that key", () => {
    const existing = "User\nAuto Generated Based on AJAX Industries Purchase Quotation 8000603";
    const next = appendIcRemarkLines(existing, [
      { cardName: "AJAX Industries", key: "PQ", text: "8000603" },
    ]);
    expect(next).toBe(existing);
  });
});
