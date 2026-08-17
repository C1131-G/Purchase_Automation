import { describe, expect, it, vi } from "vitest";

import { attachRfqSellerSalesTax } from "@/modules/intercompany/domain/rfq/attach-rfq-sales-tax";
import type { IcRfqHeader, IcRfqLine } from "@/modules/intercompany/domain/rfq/rfq.types";

const line = (overrides: Partial<IcRfqLine> = {}): IcRfqLine => ({
  deliveryDate: null,
  description: "Widget",
  discount: null,
  itemCode: "SKU-1",
  lineNum: 0,
  quantity: 1,
  remarks: null,
  rfqId: 9,
  rfqLineId: 1,
  taxCode: "IN-18",
  unitPrice: null,
  uomCode: "EA",
  warehouse: "01",
  ...overrides,
});

const header = (lines: IcRfqLine[]): IcRfqHeader => ({
  createdBy: "tester",
  customerCode: "C-BUYER",
  pqDraftDocEntry: 100,
  pqDraftDocNum: 200,
  remarks: null,
  rfqId: 9,
  rfqNumber: "RFQ-9",
  sourceCompanyId: 1,
  status: "DRAFT",
  targetCompanyId: 2,
  vendorCode: "V-SELL",
  lines,
});

describe("attachRfqSellerSalesTax", () => {
  it("resolves seller sales tax and keeps buyer purchase tax on taxCode", async () => {
    const resolve = vi.fn(async () => "OUT-18");
    const result = await attachRfqSellerSalesTax(header([line()]), resolve);

    expect(resolve).toHaveBeenCalledWith({
      itemCode: "SKU-1",
      sourceCompanyId: 1,
      sourceTaxCode: "IN-18",
      targetCardCode: "C-BUYER",
      targetCompanyId: 2,
    });
    expect(result.lines?.[0]?.taxCode).toBe("IN-18");
    expect(result.lines?.[0]?.pqTaxCode).toBe("IN-18");
    expect(result.lines?.[0]?.sqTaxCode).toBe("OUT-18");
  });

  it("does not re-resolve when sqTaxCode is already set", async () => {
    const resolve = vi.fn(async () => "SHOULD-NOT-USE");
    const result = await attachRfqSellerSalesTax(header([line({ sqTaxCode: "OUT-5" })]), resolve);

    expect(resolve).not.toHaveBeenCalled();
    expect(result.lines?.[0]?.sqTaxCode).toBe("OUT-5");
  });
});
