import { describe, expect, it, vi } from "vitest";

import { createPartnerWarehouseMasters } from "@/modules/intercompany/config/warehouse/partner-warehouse.masters";
import {
  buildSalesQuotationLines,
  createSellerSq,
  resolveSqWarehouseContext,
} from "@/modules/intercompany/flows/flow-1-pq-draft-rfq-chain/05-convert-pq-and-sq/create-seller-sq";
import type { IcSlDocuments } from "@/modules/intercompany/infrastructure/service-layer/ic-sl.documents";

describe("partner warehouse masters (branch-matched WH)", () => {
  it("returns first active WH on BPL", async () => {
    const queryTenant = vi.fn(async () => [{ WhsCode: "W01" }]);
    const masters = createPartnerWarehouseMasters({ queryTenant });

    const wh = await masters.getWarehouseForBranch("RCM_DB", 1);

    expect(wh).toBe("W01");
    expect(queryTenant).toHaveBeenCalledWith("RCM_DB", expect.stringContaining("OWHS"), [1]);
  });

  it("returns item default WH only when on same BPL", async () => {
    const queryTenant = vi.fn(async () => [{ WhsCode: "L101" }]);
    const masters = createPartnerWarehouseMasters({ queryTenant });

    const wh = await masters.getItemWarehouseOnBranch("RCM_DB", "7000000000000", 7);

    expect(wh).toBe("L101");
    expect(queryTenant).toHaveBeenCalledWith("RCM_DB", expect.stringContaining("OITM"), [
      "7000000000000",
      7,
    ]);
  });

  it("returns null when query fails", async () => {
    const masters = createPartnerWarehouseMasters({
      queryTenant: async () => {
        throw new Error("db down");
      },
    });

    expect(await masters.getWarehouseForBranch("RCM_DB", 1)).toBeNull();
  });
});

describe("buildSalesQuotationLines warehouse", () => {
  it("sets branch WH when item WH resolver returns null", async () => {
    const lines = await buildSalesQuotationLines(
      [
        {
          discount: 0,
          itemCode: "SKU1",
          lineNum: 0,
          quantity: 1,
          unitPrice: 10,
        },
      ],
      async () => "S1",
      {
        branchWarehouseCode: "W-BPL1",
        resolveLineWarehouse: async () => null,
      },
    );

    expect(lines[0]?.WarehouseCode).toBe("W-BPL1");
    expect(lines[0]?.VatGroup).toBe("S1");
  });

  it("prefers item WH on branch over branch default", async () => {
    const lines = await buildSalesQuotationLines(
      [
        {
          discount: 0,
          itemCode: "SKU1",
          lineNum: 0,
          quantity: 1,
          unitPrice: 10,
        },
      ],
      async () => "",
      {
        branchWarehouseCode: "W-BPL1",
        resolveLineWarehouse: async () => "ITEM-WH",
      },
    );

    expect(lines[0]?.WarehouseCode).toBe("ITEM-WH");
  });
});

describe("createSellerSq warehouse + branch", () => {
  it("resolves WH for branch and posts WarehouseCode on lines", async () => {
    const createSalesQuotation = vi.fn(async () => ({ docEntry: 99, docNum: 5001 }));
    const documents = { createSalesQuotation } as unknown as IcSlDocuments;
    const warehouseMasters = createPartnerWarehouseMasters({
      queryTenant: async (_db, sql) => {
        if (String(sql).includes("OITM")) {
          return [];
        }
        return [{ WhsCode: "WH-ON-1" }];
      },
    });

    await createSellerSq({
      buyerCustomerCode: "C1105",
      defaultBranchId: 1,
      documents,
      lines: [
        {
          discount: 0,
          itemCode: "7000000000000",
          lineNum: 0,
          quantity: 10,
          unitPrice: 70,
        },
      ],
      remarks: "IC | test",
      resolveLineTax: async () => "S1",
      sapDbName: "RCM_TESTING_POS1",
      sellerCompanyId: 9,
      warehouseMasters,
    });

    expect(createSalesQuotation).toHaveBeenCalledTimes(1);
    const input = createSalesQuotation.mock.calls[0]?.[0] as {
      defaultBranchId?: number;
      lines: Array<Record<string, unknown>>;
    };
    expect(input.defaultBranchId).toBe(1);
    expect(input.lines[0]?.WarehouseCode).toBe("WH-ON-1");
  });

  it("throws when branch is set but no WH exists on that BPL", async () => {
    const documents = {
      createSalesQuotation: vi.fn(),
    } as unknown as IcSlDocuments;
    const warehouseMasters = createPartnerWarehouseMasters({
      queryTenant: async () => [],
    });

    await expect(
      createSellerSq({
        buyerCustomerCode: "C1105",
        defaultBranchId: 1,
        documents,
        lines: [
          {
            discount: 0,
            itemCode: "SKU1",
            lineNum: 0,
            quantity: 1,
            unitPrice: 1,
          },
        ],
        remarks: "x",
        resolveLineTax: async () => "",
        sapDbName: "RCM_TESTING_POS1",
        sellerCompanyId: 9,
        warehouseMasters,
      }),
    ).rejects.toThrow(/No active warehouse on branch 1/);
  });

  it("resolveSqWarehouseContext skips lookup without branch or db", async () => {
    const ctx = await resolveSqWarehouseContext({
      defaultBranchId: null,
      sapDbName: "RCM",
    });
    expect(ctx.branchWarehouseCode).toBeNull();
  });
});
