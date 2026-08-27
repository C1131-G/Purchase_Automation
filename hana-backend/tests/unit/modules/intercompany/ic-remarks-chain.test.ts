import { describe, expect, it } from "vitest";

import {
  appendIcRemarkLines,
  buildFlow1ConvertRemarks,
  buildFlow1RfqRemarks,
  buildFlow1SqRemarks,
  buildFlow2ArRemarks,
  clampSapDocumentComments,
  commentsWithoutSapBaseAutoLines,
  ensureVendorRefInRemarks,
  formatIcDocLabel,
  IC_REMARK_PROFILE,
  mergeUserAndIcRemarks,
  normalizeIcRemarks,
} from "@/modules/intercompany/infrastructure/ic-remarks-chain";

describe("ic-remarks-chain", () => {
  it("RFQ remarks retain user text and include the PQ/RFQ chain", () => {
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
    expect(merged).toContain("PQ No. 9001");
    expect(merged).toContain("RFQ No. 9001");
    expect(merged).not.toContain("Auto Generated");
    expect(merged).not.toContain("AJAX Industries");
    expect(merged).not.toContain("Request For Quotation");
    expect(merged).not.toMatch(/Flow\s*[12]/i);
    expect(merged).not.toContain("IC |");
    expect(merged).not.toContain("V-B");
  });

  it("after RFQ submit buyer PQ remarks reference only RFQ", () => {
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
    expect(remarks).toContain("PQ No. 2042");
    expect(remarks).toContain("RFQ No. 9001");
    expect(remarks).not.toContain("Auto Generated");
    expect(remarks).not.toContain("Sales Quotation");
  });

  it("mergeUserAndIcRemarks recovers parent typed text when RFQ only has IC lines", () => {
    const merged = mergeUserAndIcRemarks("IC | PQ: PQ No 1\nIC | RFQ: RFQ-1", "Parent typed on PQ");
    expect(merged).toContain("Parent typed on PQ");
    expect(merged).toContain("PQ No. 1");
    expect(merged).toContain("RFQ No. 1");
    expect(merged.indexOf("Parent typed on PQ")).toBeLessThan(merged.indexOf("PQ No. 1"));
  });

  it("mergeUserAndIcRemarks unions user text from both sides + IC keys", () => {
    const merged = mergeUserAndIcRemarks(
      "Buyer note A\nIC | PQ: PQ No 1",
      "Seller-side note\nIC | RFQ: RFQ-1\nIC | PQ: PQ No 99",
    );

    expect(merged).toContain("Buyer note A");
    expect(merged).toContain("Seller-side note");
    // secondary wins on same IC key
    expect(merged).toContain("PQ No. 99");
    expect(merged).toContain("RFQ No. 1");
    expect(merged.indexOf("Buyer note A")).toBeLessThan(merged.indexOf("PQ No. 99"));
  });

  it("mergeUserAndIcRemarks normalizes legacy Based on lines to Based on TYPE form", () => {
    const chain =
      "Offline Sync\nAuto Generated Based on Purchase Quotation 8000590\nAuto Generated Based on Request For Quotation 8000590";
    const merged = mergeUserAndIcRemarks(chain, chain);
    expect(merged).toBe("Offline Sync\nPQ No. 8000590\nRFQ No. 8000590");
  });

  it("buildFlow2ArRemarks keeps PO user comments and seller RFQ + SQ lines", () => {
    const comments = buildFlow2ArRemarks({
      buyerCompanyName: "AJAX Industries",
      sellerCompanyName: "RCM Trading",
      existingComments: "Ship to dock 3",
      poDocEntry: 301,
      poDocNum: 3001,
      pqDocEntry: 55,
      pqDocNum: 2042,
      rfqId: 9,
      rfqNumber: "9001",
      sqDocEntry: 810,
      sqDocNum: 810,
    });
    expect(comments).toContain("Ship to dock 3");
    expect(comments).toBe("Ship to dock 3\nPQ No. 2042\nRFQ No. 9001\nPO No. 3001\nSQ No. 810");
    expect(comments).not.toContain("Auto Generated");
    expect(comments).toContain("PO No. 3001");
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
    expect(clamped).toMatch(/PQ No\.|RFQ No\.|SQ No\./);
  });

  it("appendIcRemarkLines is idempotent for existing keys", () => {
    const first = appendIcRemarkLines("User text", [{ key: "PO", text: "1" }]);
    const second = appendIcRemarkLines(first, [{ key: "PO", text: "999" }]);
    expect(second).toBe(first);
    expect(second).toContain("User text");
    expect(first).toBe("User text\nPO No. 1");
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

  it("buildFlow1SqRemarks includes the known PQ/RFQ/SQ chain", () => {
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
    expect(remarks).toContain("RFQ No. 9001");
    expect(remarks).toContain("PQ No. 2042");
    expect(remarks).toContain("SQ No. 810");
    expect(remarks).not.toContain("Auto Generated");
    expect(remarks.indexOf("Ship ASAP")).toBeLessThan(remarks.indexOf("RFQ No. 9001"));
    expect(remarks.indexOf("Vendor Ref No")).toBeLessThan(remarks.indexOf("RFQ No. 9001"));
  });

  it("normalizes buyer chains to PQ, RFQ, then PO", () => {
    const remarks = normalizeIcRemarks(
      "User note\nBased on PO 300\nBased on PQ 100\nBased on RFQ 200\nBased on PQ 999",
      IC_REMARK_PROFILE.BUYER,
    );

    expect(remarks).toBe("User note\nPQ No. 999\nRFQ No. 200\nPO No. 300");
  });

  it("normalizes seller chains to PQ, RFQ, PO, then SQ", () => {
    const remarks = normalizeIcRemarks(
      "Seller note\nBased on PQ 100\nBased on SQ 300\nBased on PO 200\nBased on RFQ 250",
      IC_REMARK_PROFILE.SELLER,
    );

    expect(remarks).toBe("Seller note\nPQ No. 100\nRFQ No. 250\nPO No. 200\nSQ No. 300");
  });

  it("parses multi-word company name legacy Based on lines for merge/idempotency", () => {
    const first = appendIcRemarkLines("Note", [
      { cardName: "AJAX Industries", key: "PQ", text: "132424" },
    ]);
    expect(first).toBe("Note\nPQ No. 132424");
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

  it("drops a second Based on PQ (short + SAP long) in existing remarks", () => {
    const existing =
      "Created from portal\rBased on PQ 8000586\rBased On Purchase Quotations 8000586";
    const next = appendIcRemarkLines(existing, [{ key: "RFQ", text: "8000586" }]);
    expect(next).toBe("Created from portal\nBased on PQ 8000586\nRFQ No. 8000586");
    expect(next.match(/PQ|Purchase Quotation/gi)?.length).toBe(1);
  });

  it("strips Based on PQ when lines are SAP-based on a purchase quotation", () => {
    const comments = "User note\nBased on PQ 8000586\nBased on RFQ 8000586";
    const stripped = commentsWithoutSapBaseAutoLines(comments, [{ BaseType: 540000006 }]);
    expect(stripped).toBe("User note\nRFQ No. 8000586");
    expect(stripped).not.toContain("Based on PQ");
  });
});
