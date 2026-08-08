import { describe, expect, it } from "vitest";

import {
  branchIdFromWarehouse,
  documentBranchPayload,
  formatBranchDisplay,
  shouldShowDocumentBranch,
  toPositiveBranchId,
} from "@/features/create-pages/create-shared/utils/document-branch";

describe("document-branch helpers", () => {
  it("maps warehouse to branchId", () => {
    expect(
      branchIdFromWarehouse(
        [
          { code: "01", branchId: 1 },
          { code: "L101", branchId: 7 },
        ],
        "L101",
      ),
    ).toBe(7);
  });

  it("returns empty payload when no branch", () => {
    expect(documentBranchPayload(null)).toEqual({});
    expect(documentBranchPayload(0)).toEqual({});
  });

  it("returns SAP BPL fields when branch set", () => {
    expect(documentBranchPayload(3)).toEqual({
      BPL_IDAssignedToInvoice: 3,
      branchId: 3,
    });
  });

  it("always shows branch field (Ajax single-branch and RCM multi-branch)", () => {
    expect(shouldShowDocumentBranch([], [])).toBe(true);
    expect(shouldShowDocumentBranch([{ code: "1", name: "A" }], [])).toBe(true);
    expect(
      shouldShowDocumentBranch(
        [
          { code: "1", name: "A" },
          { code: "2", name: "B" },
        ],
        [],
      ),
    ).toBe(true);
    expect(shouldShowDocumentBranch([], [{ code: "01", branchId: 1 }])).toBe(true);
  });

  it("formats branch display", () => {
    expect(formatBranchDisplay("Main", 1)).toBe("Main (1)");
    expect(toPositiveBranchId("2")).toBe(2);
  });
});
