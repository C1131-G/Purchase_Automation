import { describe, expect, it, vi } from "vitest";

import { attachRfqSellerSalesUom } from "@/modules/intercompany/domain/rfq/attach-rfq-sales-uom";
import type { IcRfqHeader, IcRfqLine } from "@/modules/intercompany/domain/rfq/rfq.types";

const line = (overrides: Partial<IcRfqLine> = {}): IcRfqLine => ({
  deliveryDate: null,
  description: "Widget",
  discount: null,
  itemCode: "RCM-SKU-1",
  lineNum: 0,
  quantity: 1,
  remarks: null,
  rfqId: 9,
  rfqLineId: 1,
  taxCode: "IN-18",
  unitPrice: null,
  uomCode: "BOX",
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

describe("attachRfqSellerSalesUom", () => {
  it("resolves seller sales UoM and keeps buyer purchase UoM on uomCode", async () => {
    const resolve = vi.fn(async () => ({ uomCode: "PCS", uomEntry: 7 }));
    const result = await attachRfqSellerSalesUom(header([line()]), resolve);

    expect(resolve).toHaveBeenCalledWith({
      itemCode: "RCM-SKU-1",
      sourceUomCode: "BOX",
      targetCompanyId: 2,
    });
    expect(result.lines?.[0]?.uomCode).toBe("BOX");
    expect(result.lines?.[0]?.sqUomCode).toBe("PCS");
    expect(result.lines?.[0]?.sqUomEntry).toBe(7);
  });

  it("matches seller sales UoM when item master stores the OUOM name", async () => {
    const resolve = vi.fn(async () => ({ uomCode: "PCS", uomEntry: 1 }));
    const result = await attachRfqSellerSalesUom(header([line({ uomCode: "Pieces" })]), resolve);

    expect(resolve).toHaveBeenCalledWith({
      itemCode: "RCM-SKU-1",
      sourceUomCode: "Pieces",
      targetCompanyId: 2,
    });
    expect(result.lines?.[0]?.sqUomCode).toBe("PCS");
    expect(result.lines?.[0]?.uomCode).toBe("Pieces");
  });

  it("does not re-resolve when sqUomCode is already set", async () => {
    const resolve = vi.fn(async () => ({ uomCode: "SHOULD-NOT-USE", uomEntry: 99 }));
    const result = await attachRfqSellerSalesUom(
      header([line({ sqUomCode: "EACH", sqUomEntry: 3 })]),
      resolve,
    );

    expect(resolve).not.toHaveBeenCalled();
    expect(result.lines?.[0]?.sqUomCode).toBe("EACH");
    expect(result.lines?.[0]?.sqUomEntry).toBe(3);
  });

  it("leaves buyer UoM when sales resolve is empty", async () => {
    const resolve = vi.fn(async () => null);
    const result = await attachRfqSellerSalesUom(header([line()]), resolve);
    expect(result.lines?.[0]?.uomCode).toBe("BOX");
    expect(result.lines?.[0]?.sqUomCode).toBeUndefined();
  });
});
