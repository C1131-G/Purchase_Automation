import { beforeEach, describe, expect, it, vi } from "vitest";

const { executeTenantQuery } = vi.hoisted(() => ({ executeTenantQuery: vi.fn() }));
vi.mock("@/db/tenant-query", () => ({ executeTenantQuery }));
vi.mock("@/modules/intercompany/config/company/company.queries", () => ({
  createCompanyQueries: () => ({
    getById: vi.fn(async () => ({ sapDbName: "BUYER_DB" })),
  }),
}));
vi.mock("@/modules/intercompany/domain/rfq/resolve-rfq-customer-display", () => ({
  resolveRfqCustomerDisplay: vi.fn(async () => ({
    customerCode: "C-SELLER",
    customerName: "Buyer",
  })),
  withRfqCustomerDisplay: (header: unknown) => header,
}));
vi.mock("@/modules/intercompany/domain/rfq/attach-rfq-sales-tax", () => ({
  attachRfqSellerSalesTax: vi.fn(async (header: unknown) => header),
}));
vi.mock("@/modules/intercompany/domain/rfq/attach-rfq-sales-uom", () => ({
  attachRfqSellerSalesUom: vi.fn(async (header: unknown) => header),
}));

import { enrichRfqFromPqDraft } from "@/modules/intercompany/domain/rfq/enrich-rfq-from-pq-draft";

describe("IC RFQ salesperson enrichment", () => {
  beforeEach(() => {
    executeTenantQuery.mockImplementation(async (_db: string, sql: string) => {
      if (sql.includes('FROM "OPQT"')) {
        return [{ CardCode: "V-SELLER", CardName: "Seller", SlpCode: 17, DocNum: 9001 }];
      }
      if (sql.includes('FROM "PQT1"')) {
        return [
          { ItemCode: "ITEM-1", LineNum: 0, Quantity: 1, WhsCode: "BUYER-WH" },
          { ItemCode: "ITEM-2", LineNum: 1, Quantity: 2, WhsCode: "OTHER-WH" },
        ];
      }
      if (sql.includes('FROM "OSLP"')) {
        return [{ SlpName: "Alice Buyer" }];
      }
      return [];
    });
  });

  it("shows the buyer salesperson for every IC warehouse line", async () => {
    const result = await enrichRfqFromPqDraft({
      buyerCode: null,
      buyerName: null,
      customerCode: null,
      customerName: null,
      lines: [],
      pqDraftDocEntry: 55,
      pqDraftDocNum: 9001,
      rfqId: 1,
      rfqNumber: "RFQ-1",
      sourceCompanyId: 1,
      status: "DRAFT",
      targetCompanyId: 2,
      vendorCode: "V-SELLER",
    });

    expect(result.buyerCode).toBe("17");
    expect(result.buyerName).toBe("Alice Buyer");
    expect(result.lines.map((line) => line.warehouse)).toEqual(["BUYER-WH", "OTHER-WH"]);
  });
});
