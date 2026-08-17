import { describe, expect, it } from "vitest";

import {
  hasIcRemarkLines,
  parseDocumentHeaderNotes,
} from "@/features/create-pages/create-shared/utils/parse-header-notes";

describe("parseDocumentHeaderNotes", () => {
  it("keeps parent typed Comments when Based on chain lines are present (no Ref steal)", () => {
    const comments = [
      "Please match last quote",
      "Urgent for plant B",
      "Based on Purchase Quotation Draft 9001",
      "Based on Request For Quotation 9001",
      "Based on Purchase Quotation 2042",
    ].join("\n");

    const parsed = parseDocumentHeaderNotes({
      Comments: comments,
      NumAtCard: "",
    });

    expect(hasIcRemarkLines(comments)).toBe(true);
    expect(parsed.referenceNo).toBe("");
    expect(parsed.comments).toContain("Please match last quote");
    expect(parsed.comments).toContain("Urgent for plant B");
    expect(parsed.comments).toContain("Based on Purchase Quotation Draft 9001");
    expect(parsed.comments).toContain("Based on Purchase Quotation 2042");
  });

  it("recognizes legacy IC | chain lines", () => {
    const comments = "Parent note\nIC | PQD: PQ Draft No 1\nIC | RFQ: RFQ-1";
    expect(hasIcRemarkLines(comments)).toBe(true);
    const parsed = parseDocumentHeaderNotes({ Comments: comments, NumAtCard: null });
    expect(parsed.referenceNo).toBe("");
    expect(parsed.comments).toBe(comments);
  });

  it("does not split parent message into Ref No when Based on appears", () => {
    const comments =
      "Parent note\nBased on Purchase Quotation Draft 1\nBased on Request For Quotation 1";
    const parsed = parseDocumentHeaderNotes({ Comments: comments, NumAtCard: null });
    expect(parsed.referenceNo).toBe("");
    expect(parsed.comments).toBe(comments);
  });

  it("keeps real NumAtCard as Ref No and full Comments", () => {
    const comments = "Ship dock 3\nBased on Purchase Order 188";
    const parsed = parseDocumentHeaderNotes({
      Comments: comments,
      NumAtCard: "VREF-99",
    });
    expect(parsed.referenceNo).toBe("VREF-99");
    expect(parsed.comments).toBe(comments);
  });

  it("dedupes SAP \\r Based on PQ twice into one line", () => {
    const parsed = parseDocumentHeaderNotes({
      Comments: "Created from portal\rBased on PQ 8000586\rBased On Purchase Quotations 8000586",
      NumAtCard: "",
    });
    expect(parsed.comments).toBe("Created from portal\nBased on PQ 8000586");
  });

  it("still supports legacy single-line REF | message when no IC lines", () => {
    const parsed = parseDocumentHeaderNotes({
      Comments: "REF-123 | Urgent delivery",
      NumAtCard: "",
    });
    expect(parsed.referenceNo).toBe("REF-123");
    expect(parsed.comments).toBe("Urgent delivery");
  });
});
