import { describe, expect, it } from "vitest";

import {
  clipSapText,
  SAP_CHECK_NUMBER_PATTERN,
  SAP_FIELD_MAX,
  sapCommentsField,
  sapDocumentTextErrors,
  sapRemarksField,
  toSapCommentsPayload,
} from "@/features/create-pages/create-shared/utils/sap-document-fields";

describe("SAP document field limits", () => {
  it("matches SAP B1 DI API / table lengths", () => {
    expect(SAP_FIELD_MAX.cardCode).toBe(15);
    expect(SAP_FIELD_MAX.cardName).toBe(100);
    expect(SAP_FIELD_MAX.numAtCard).toBe(100);
    expect(SAP_FIELD_MAX.comments).toBe(254);
    expect(SAP_FIELD_MAX.address).toBe(254);
    expect(SAP_FIELD_MAX.itemCode).toBe(50);
    expect(SAP_FIELD_MAX.warehouseCode).toBe(8);
    expect(SAP_FIELD_MAX.vatGroup).toBe(8);
    expect(SAP_FIELD_MAX.lotNumber).toBe(36);
    expect(SAP_FIELD_MAX.transferReference).toBe(27);
  });

  it("clips typed text at the SAP max", () => {
    expect(clipSapText("V1005", SAP_FIELD_MAX.cardCode)).toBe("V1005");
    expect(clipSapText("X".repeat(20), SAP_FIELD_MAX.cardCode)).toHaveLength(15);
  });

  it("allows free text in remarks and reference (SAP nvarchar)", () => {
    const errors = sapDocumentTextErrors({
      comments: "Urgent — deliver to Gate #2 (ref: A/B)",
      numAtCard: "PO-2026/08-99",
    });
    expect(errors).toEqual({});
  });

  it("rejects overflow that Service Layer would reject", () => {
    const errors = sapDocumentTextErrors({
      cardCode: "V".repeat(16),
      comments: "c".repeat(255),
      numAtCard: "r".repeat(101),
    });
    expect(errors.cardCode).toMatch(/15/);
    expect(errors.comments).toMatch(/254/);
    expect(errors.numAtCard).toMatch(/100/);
  });

  it("sends trimmed remarks clipped to SAP Comments length", () => {
    expect(toSapCommentsPayload("  keep me  ")).toBe("keep me");
    expect(toSapCommentsPayload("   ")).toBeUndefined();
    expect(toSapCommentsPayload(null)).toBeUndefined();
    expect(toSapCommentsPayload("c".repeat(300))).toHaveLength(254);
    expect(sapCommentsField("  keep me  ")).toEqual({ Comments: "keep me" });
    expect(sapCommentsField("   ")).toEqual({});
    expect(sapRemarksField("pay now")).toEqual({ Remarks: "pay now" });
    expect(sapRemarksField("")).toEqual({});
  });

  it("allows digit-only cheque numbers", () => {
    expect(SAP_CHECK_NUMBER_PATTERN.test("123456")).toBe(true);
    expect(SAP_CHECK_NUMBER_PATTERN.test("12A")).toBe(false);
    expect(SAP_CHECK_NUMBER_PATTERN.test("12-3")).toBe(false);
  });
});
