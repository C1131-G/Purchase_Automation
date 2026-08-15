import { describe, expect, it } from "vitest";

import {
  clampDocumentLineQuantity,
  MIN_DOCUMENT_LINE_QUANTITY,
  parseDocumentLineQuantity,
} from "@/features/create-pages/create-shared/utils/document-line-quantity";

describe("document line quantity", () => {
  it("uses 1 as the minimum quantity", () => {
    expect(MIN_DOCUMENT_LINE_QUANTITY).toBe(1);
  });

  it("rejects empty, zero, and invalid values", () => {
    expect(parseDocumentLineQuantity("")).toBe(1);
    expect(parseDocumentLineQuantity("0")).toBe(1);
    expect(parseDocumentLineQuantity("-3")).toBe(1);
    expect(parseDocumentLineQuantity("abc")).toBe(1);
    expect(clampDocumentLineQuantity(0, { integer: true })).toBe(1);
    expect(clampDocumentLineQuantity(undefined)).toBe(1);
  });

  it("keeps valid quantities", () => {
    expect(parseDocumentLineQuantity("2.5")).toBe(2.5);
    expect(parseDocumentLineQuantity("2.9", { integer: true })).toBe(2);
    expect(clampDocumentLineQuantity(12)).toBe(12);
  });
});
