import { describe, expect, it, vi } from "vitest";

import { createPartnerWarehouseMasters } from "@/modules/intercompany/config/warehouse/partner-warehouse.masters";
import {
  buildSalesQuotationLines,
  createSellerSq,
  resolveSqWarehouseContext,
} from "@/modules/intercompany/flows/flow-1-pq-rfq-chain/05-convert-pq-and-sq/create-seller-sq";
import type { IcSlDocuments } from "@/modules/intercompany/infrastructure/service-layer/ic-sl.documents";

describe("partner warehouse masters (branch-matched WH)", () => {
  it("returns first active WH on BPL", async () => {
    const queryTenant = vi.fn(async () => [{ WhsCode: "W01" }]);
    const masters = createPartnerWarehouseMasters({ queryTenant });

    const wh = await masters.getWarehouseForBranch("RCM_DB", 1);

    expect(wh).toBe("W01");
    expect(queryTenant).toHaveBeenCalledWith("RCM_DB", expect.stringContaining("OWHS"), [1]);
  });

  it("returns first active branch+WH fallback", async () => {
    const queryTenant = vi.fn(async () => [{ BPLid: 7, WhsCode: "L101" }]);
    const masters = createPartnerWarehouseMasters({ queryTenant });

    const row = await masters.getFirstActiveBranchWarehouse("RCM_DB");

    expect(row).toEqual({ branchId: 7, warehouseCode: "L101" });
    expect(queryTenant).toHaveBeenCalledWith("RCM_DB", expect.stringContaining("OWHS"));
  });

  it("returns null when query fails", async () => {
    const masters = createPartnerWarehouseMasters({
      queryTenant: async () => {
        throw new Error("db down");
      },
    });

    expect(await masters.getWarehouseForBranch("RCM_DB", 1)).toBeNull();
    expect(await masters.getFirstActiveBranchWarehouse("RCM_DB")).toBeNull();
  });
});

describe("buildSalesQuotationLines warehouse", () => {
  it("sets branch WH on all lines (no item WH switch)", async () => {
    const { documentLines, taxUsage } = await buildSalesQuotationLines(
      [
        {
          discount: 0,
          itemCode: "SKU1",
          lineNum: 0,
          pqTaxCode: "BUYER-PU",
          quantity: 1,
          taxCode: "BUYER-PU",
          unitPrice: 10,
        },
      ],
      async () => "S1",
      {
        branchWarehouseCode: "W-BPL1",
      },
    );

    expect(documentLines[0]?.WarehouseCode).toBe("W-BPL1");
    expect(documentLines[0]?.VatGroup).toBe("S1");
    expect(taxUsage[0]).toMatchObject({
      pqTaxCode: "BUYER-PU",
      sqTaxCode: "S1",
    });
  });
});

describe("createSellerSq warehouse + branch", () => {
  it("uses default branch WH when available", async () => {
    const createSalesQuotation = vi.fn(async () => ({ docEntry: 99, docNum: 5001 }));
    const documents = { createSalesQuotation } as unknown as IcSlDocuments;
    const warehouseMasters = createPartnerWarehouseMasters({
      queryTenant: async (_db, sql, params) => {
        if (String(sql).includes("BPLid") && Array.isArray(params) && params[0] === 1) {
          return [{ WhsCode: "WH-ON-1" }];
        }
        return [];
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

  it("switches to available branch when default branch has no WH", async () => {
    const createSalesQuotation = vi.fn(async () => ({ docEntry: 100, docNum: 5002 }));
    const documents = { createSalesQuotation } as unknown as IcSlDocuments;
    let call = 0;
    const warehouseMasters = createPartnerWarehouseMasters({
      queryTenant: async (_db, sql) => {
        call += 1;
        // 1st: getWarehouseForBranch(default) → empty
        // 2nd: getFirstActiveBranchWarehouse → BPL 7
        if (call === 1 && String(sql).includes("BPLid") && String(sql).includes("= ?")) {
          return [];
        }
        return [{ BPLid: 7, WhsCode: "WH-ON-7" }];
      },
    });

    await createSellerSq({
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
    });

    const input = createSalesQuotation.mock.calls[0]?.[0] as {
      defaultBranchId?: number;
      lines: Array<Record<string, unknown>>;
    };
    expect(input.defaultBranchId).toBe(7);
    expect(input.lines[0]?.WarehouseCode).toBe("WH-ON-7");
  });

  it("throws when no WH exists on default or any fallback branch", async () => {
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
    ).rejects.toThrow(/No active warehouse/);
  });

  it("resolveSqWarehouseContext skips lookup without db", async () => {
    const ctx = await resolveSqWarehouseContext({
      defaultBranchId: 1,
      sapDbName: null,
    });
    expect(ctx.branchId).toBe(1);
    expect(ctx.branchWarehouseCode).toBeNull();
    expect(ctx.switchedFromDefault).toBe(false);
  });

  it("resolveSqWarehouseContext falls back when default has no WH", async () => {
    const masters = createPartnerWarehouseMasters({
      queryTenant: async (_db, sql) => {
        if (String(sql).includes("= ?")) {
          return [];
        }
        return [{ BPLid: 3, WhsCode: "W3" }];
      },
    });
    const ctx = await resolveSqWarehouseContext({
      defaultBranchId: 1,
      sapDbName: "DB",
      warehouseMasters: masters,
    });
    expect(ctx).toEqual({
      branchId: 3,
      branchWarehouseCode: "W3",
      switchedFromDefault: true,
    });
  });
});
