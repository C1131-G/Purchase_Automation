import { describe, expect, it } from "vitest";

import { PurchaseQuotationQuerySchema } from "@/modules/purchase-quotation/purchase-quotation.schema";
import { MasterDataQuerySchema } from "@/modules/master-data/master-data.schema";

describe("PurchaseQuotationQuerySchema", () => {
  it("accepts the PQ master-data catalog scope", () => {
    expect(MasterDataQuerySchema.safeParse({ catalog: "purchase-quotation" }).success).toBe(true);
    expect(MasterDataQuerySchema.safeParse({ catalog: "purchase-order" }).success).toBe(false);
  });
  it("accepts empty query", () => {
    expect(PurchaseQuotationQuerySchema.safeParse({}).success).toBe(true);
  });

  it("accepts explicit page and limit", () => {
    const result = PurchaseQuotationQuerySchema.safeParse({ page: 2, limit: 25 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(2);
      expect(result.data.limit).toBe(25);
    }
  });

  it("coerces rfqSubmittedOnly query flags", () => {
    const enabled = PurchaseQuotationQuerySchema.safeParse({ rfqSubmittedOnly: "true" });
    expect(enabled.success).toBe(true);
    if (enabled.success) {
      expect(enabled.data.rfqSubmittedOnly).toBe(true);
    }

    const omitted = PurchaseQuotationQuerySchema.safeParse({});
    expect(omitted.success).toBe(true);
    if (omitted.success) {
      expect(omitted.data.rfqSubmittedOnly).toBeFalsy();
    }
  });
});
