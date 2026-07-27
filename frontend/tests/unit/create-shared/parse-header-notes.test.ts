import { describe, expect, it } from "vitest";

import {
  hasIcRemarkLines,
  parseDocumentHeaderNotes,
} from "@/features/create-pages/create-shared/utils/parse-header-notes";

describe("parseDocumentHeaderNotes", () => {
  it("keeps parent typed Comments when IC chain lines are present (no Ref steal)", () => {
    const comments = [
      "Please match last quote",
      "Urgent for plant B",
      "IC | PQD: PQ Draft No 9001",
      "IC | RFQ: RFQ-PQD-9001",
      "IC | PQ: PQ No 2042",
    ].join("\n");

    const parsed = parseDocumentHeaderNotes({
      Comments: comments,
      NumAtCard: "",
    });

    expect(hasIcRemarkLines(comments)).toBe(true);
    expect(parsed.referenceNo).toBe("");
    expect(parsed.comments).toContain("Please match last quote");
    expect(parsed.comments).toContain("Urgent for plant B");
    expect(parsed.comments).toContain("IC | PQD: PQ Draft No 9001");
    expect(parsed.comments).toContain("IC | PQ: PQ No 2042");
  });

  it("does not split parent message into Ref No when IC | appears", () => {
    // Legacy bug: split(" | ") moved "Parent note\\nIC" into referenceNo
    const comments = "Parent note\nIC | PQD: PQ Draft No 1\nIC | RFQ: RFQ-1";
    const parsed = parseDocumentHeaderNotes({ Comments: comments, NumAtCard: null });
    expect(parsed.referenceNo).toBe("");
    expect(parsed.comments).toBe(comments);
  });

  it("keeps real NumAtCard as Ref No and full Comments", () => {
    const comments = "Ship dock 3\nIC | PO: PO No 188";
    const parsed = parseDocumentHeaderNotes({
      Comments: comments,
      NumAtCard: "VREF-99",
    });
    expect(parsed.referenceNo).toBe("VREF-99");
    expect(parsed.comments).toBe(comments);
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
