import { describe, expect, it } from "vitest";

import {
  CreatePurchaseOrderInputSchema,
  UpdatePurchaseOrderInputSchema,
} from "@/modules/purchase-order/purchase-order.schema";
import { UpdateSalesQuotationInputSchema } from "@/modules/sales-quotation/sales-quotation.schema";
import { SAP_FIELD_MAX, toSapCommentsField } from "@/validation/schemas/inputs/sap-document-fields";
import { SapBatchNumberInputSchema } from "@/validation/schemas/inputs/sap-lot-collections.schema";

describe("SAP document field limits", () => {
  it("matches DI API / HANA table lengths", () => {
    expect(SAP_FIELD_MAX.cardCode).toBe(15);
    expect(SAP_FIELD_MAX.numAtCard).toBe(100);
    expect(SAP_FIELD_MAX.comments).toBe(254);
    expect(SAP_FIELD_MAX.address).toBe(254);
    expect(SAP_FIELD_MAX.itemCode).toBe(50);
    expect(SAP_FIELD_MAX.warehouseCode).toBe(8);
    expect(SAP_FIELD_MAX.lotNumber).toBe(36);
    expect(SAP_FIELD_MAX.transferReference).toBe(27);
  });

  it("rejects marketing-document text longer than SAP allows", () => {
    const result = CreatePurchaseOrderInputSchema.safeParse({
      CardCode: "V".repeat(16),
      Comments: "c".repeat(255),
      NumAtCard: "r".repeat(101),
      DocumentLines: [{ ItemCode: "SKU1", Quantity: 1 }],
    });
    expect(result.success).toBe(false);
  });

  it("accepts remarks and reference with punctuation SAP allows", () => {
    const result = CreatePurchaseOrderInputSchema.safeParse({
      CardCode: "V1005",
      Comments: "Urgent — Gate #2 (A/B)",
      NumAtCard: "PO-2026/08-99",
      DocumentLines: [{ ItemCode: "SKU1", Quantity: 1 }],
    });
    expect(result.success).toBe(true);
  });

  it("keeps frontend branch ids on create so SAP BPL is assigned", () => {
    const result = CreatePurchaseOrderInputSchema.safeParse({
      CardCode: "V1005",
      DocumentLines: [{ ItemCode: "SKU1", Quantity: 1 }],
      BPL_IDAssignedToInvoice: 3,
      branchId: 3,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.BPL_IDAssignedToInvoice).toBe(3);
      expect(result.data.branchId).toBe(3);
    }
  });

  it("accepts branch ids on strict document updates", () => {
    const po = UpdatePurchaseOrderInputSchema.safeParse({
      Comments: "updated",
      BPL_IDAssignedToInvoice: 2,
      branchId: 2,
    });
    const sq = UpdateSalesQuotationInputSchema.safeParse({
      Comments: "updated",
      BPL_IDAssignedToInvoice: 2,
      branchId: 2,
    });
    expect(po.success).toBe(true);
    expect(sq.success).toBe(true);
  });

  it("clips remarks to SAP Comments length for Service Layer", () => {
    expect(toSapCommentsField("  keep me  ")).toBe("keep me");
    expect(toSapCommentsField("   ")).toBeUndefined();
    expect(toSapCommentsField(null)).toBeUndefined();
    expect(toSapCommentsField("c".repeat(300))).toHaveLength(254);
  });

  it("rejects batch numbers longer than DistNumber (36)", () => {
    const result = SapBatchNumberInputSchema.safeParse({
      BatchNumber: "A".repeat(37),
      Quantity: 1,
    });
    expect(result.success).toBe(false);
  });
});
