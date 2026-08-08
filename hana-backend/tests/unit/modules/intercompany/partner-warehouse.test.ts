import { describe, expect, it, vi } from "vitest";

import {
  createPartnerWarehouseMasters,
  type PartnerWarehouseMasters,
} from "@/modules/intercompany/config/warehouse/partner-warehouse.masters";
import {
  buildSalesQuotationLines,
  createSellerSq,
  pickPqWarehouseCode,
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

  it("resolveWarehouseIfExists returns BPL for known WH", async () => {
    const queryTenant = vi.fn(async () => [{ BPLid: 4, WhsCode: "PQ-WH" }]);
    const masters = createPartnerWarehouseMasters({ queryTenant });

    const row = await masters.resolveWarehouseIfExists("RCM_DB", "PQ-WH");

    expect(row).toEqual({ branchId: 4, warehouseCode: "PQ-WH" });
    expect(queryTenant).toHaveBeenCalledWith("RCM_DB", expect.stringContaining("WhsCode"), [
      "PQ-WH",
    ]);
  });

  it("returns null when query fails", async () => {
    const masters = createPartnerWarehouseMasters({
      queryTenant: async () => {
        throw new Error("db down");
      },
    });

    expect(await masters.getWarehouseForBranch("RCM_DB", 1)).toBeNull();
    expect(await masters.getFirstActiveBranchWarehouse("RCM_DB")).toBeNull();
    expect(await masters.getFirstActiveWarehouse("RCM_DB")).toBeNull();
    expect(await masters.getDefaultObplBranch("RCM_DB")).toBeNull();
    expect(await masters.resolveWarehouseIfExists("RCM_DB", "X")).toBeNull();
  });

  it("any active WH works without BPLid (Ajax-style)", async () => {
    const masters = createPartnerWarehouseMasters({
      queryTenant: async () => [{ BPLid: null, WhsCode: "01" }],
    });
    await expect(masters.getFirstActiveWarehouse("AJAX_POS_DB")).resolves.toEqual({
      branchId: null,
      warehouseCode: "01",
    });
  });

  it("getDefaultObplBranch reads first enabled place", async () => {
    const masters = createPartnerWarehouseMasters({
      queryTenant: async () => [{ BPLId: 2 }],
    });
    await expect(masters.getDefaultObplBranch("AJAX_POS_DB")).resolves.toBe(2);
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
          uomCode: "BUYER-UOM",
        },
      ],
      async () => "S1",
      {
        branchWarehouseCode: "W-BPL1",
      },
    );

    expect(documentLines[0]?.WarehouseCode).toBe("W-BPL1");
    expect(documentLines[0]?.VatGroup).toBe("S1");
    // Always keep PQ/RFQ UoM — never OITM sales default.
    expect(documentLines[0]?.UoMCode).toBe("BUYER-UOM");
    expect(documentLines[0]?.UseBaseUnit).toBe("tNO");
    expect(taxUsage[0]).toMatchObject({
      pqTaxCode: "BUYER-PU",
      sqTaxCode: "S1",
    });
  });

  it("keeps RFQ UoM and resolves UoMEntry so SQ is not Manual", async () => {
    const { documentLines } = await buildSalesQuotationLines(
      [
        {
          deliveryDate: null,
          description: null,
          discount: 0,
          itemCode: "I1",
          lineNum: 0,
          quantity: 1,
          remarks: null,
          rfqId: 1,
          rfqLineId: 1,
          taxCode: null,
          unitPrice: 1,
          uomCode: "Each",
          // Buyer UoMEntry must not be trusted — seller resolver supplies entry.
          uomEntry: 99,
          warehouse: null,
        },
      ],
      async () => "",
      {
        branchWarehouseCode: "WH01",
        resolveUom: async ({ uomCode }) => ({ uomCode, uomEntry: 5 }),
      },
    );
    expect(documentLines[0]?.UoMCode).toBe("Each");
    expect(documentLines[0]?.UoMEntry).toBe(5);
    expect(documentLines[0]?.UseBaseUnit).toBe("tNO");
  });

  it("keeps RFQ UoM when warehouse is set (does not drop or rewrite UoM)", async () => {
    const { documentLines } = await buildSalesQuotationLines(
      [
        {
          discount: 0,
          itemCode: "ITEM-A",
          lineNum: 0,
          quantity: 5,
          unitPrice: 12,
          uomCode: "BOX",
          warehouse: "WH-PQ",
        },
      ],
      async () => "",
      { branchWarehouseCode: "WH-PQ" },
    );

    expect(documentLines[0]?.WarehouseCode).toBe("WH-PQ");
    expect(documentLines[0]?.UoMCode).toBe("BOX");
    // No seller sapDbName / resolveUom → code only (entry resolved at create with sapDbName).
    expect(documentLines[0]?.UoMEntry).toBeUndefined();
    expect(documentLines[0]?.UseBaseUnit).toBe("tNO");
  });

  it("does not trust buyer UoMEntry; uses seller-resolved entry only", async () => {
    const { documentLines } = await buildSalesQuotationLines(
      [
        {
          discount: 0,
          itemCode: "SKU1",
          lineNum: 0,
          quantity: 1,
          unitPrice: 10,
          uomCode: "Each",
          uomEntry: 1, // buyer books — must not pass through
        },
      ],
      async () => "S1",
      {
        branchWarehouseCode: "W1",
        resolveUom: async () => ({ uomCode: "Each", uomEntry: 42 }),
      },
    );
    expect(documentLines[0]?.UoMCode).toBe("Each");
    expect(documentLines[0]?.UoMEntry).toBe(42);
  });
});

describe("createSellerSq warehouse + branch", () => {
  it("uses PQ warehouse and switches branch when PQ WH exists on seller", async () => {
    const createSalesQuotation = vi.fn(async () => ({ docEntry: 98, docNum: 5000 }));
    const documents = { createSalesQuotation } as unknown as IcSlDocuments;
    const warehouseMasters = createPartnerWarehouseMasters({
      queryTenant: async (_db, sql, params) => {
        // resolveWarehouseIfExists: WhsCode = ?
        if (String(sql).includes("WhsCode") && Array.isArray(params) && params[0] === "WH-PQ") {
          return [{ BPLid: 5, WhsCode: "WH-PQ" }];
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
          itemCode: "SKU1",
          lineNum: 0,
          quantity: 1,
          unitPrice: 10,
          warehouse: "WH-PQ",
        },
      ],
      remarks: "IC | test",
      resolveLineTax: async () => "S1",
      sapDbName: "RCM_TESTING_POS1",
      sellerCompanyId: 9,
      warehouseMasters,
    });

    const input = createSalesQuotation.mock.calls[0]?.[0] as {
      defaultBranchId?: number;
      lines: Array<Record<string, unknown>>;
    };
    expect(input.defaultBranchId).toBe(5);
    expect(input.lines[0]?.WarehouseCode).toBe("WH-PQ");
  });

  it("uses default branch WH when PQ WH not on seller", async () => {
    const createSalesQuotation = vi.fn(async () => ({ docEntry: 99, docNum: 5001 }));
    const documents = { createSalesQuotation } as unknown as IcSlDocuments;
    const warehouseMasters = createPartnerWarehouseMasters({
      queryTenant: async (_db, sql, params) => {
        // PQ WH lookup fails (empty)
        if (String(sql).includes("WhsCode") && Array.isArray(params) && params[0] === "BUYER-WH") {
          return [];
        }
        // getWarehouseForBranch(default 1)
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
          warehouse: "BUYER-WH",
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
    const warehouseMasters = createPartnerWarehouseMasters({
      queryTenant: async (_db, _sql, params) => {
        // getWarehouseForBranch(default 1) — bound param
        if (Array.isArray(params) && params[0] === 1) {
          return [];
        }
        // getFirstActiveBranchWarehouse — no params
        if (params == null || (Array.isArray(params) && params.length === 0)) {
          return [{ BPLid: 7, WhsCode: "WH-ON-7" }];
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

  it("pickPqWarehouseCode reads first line warehouse", () => {
    expect(
      pickPqWarehouseCode([
        {
          discount: 0,
          itemCode: "A",
          lineNum: 0,
          quantity: 1,
          unitPrice: 1,
          warehouse: null,
        },
        {
          discount: 0,
          itemCode: "B",
          lineNum: 1,
          quantity: 1,
          unitPrice: 1,
          warehouse: "W-X",
        },
      ] as never),
    ).toBe("W-X");
  });

  it("resolveSqWarehouseContext skips lookup without db", async () => {
    const ctx = await resolveSqWarehouseContext({
      defaultBranchId: 1,
      sapDbName: null,
    });
    expect(ctx.branchId).toBe(1);
    expect(ctx.branchWarehouseCode).toBeNull();
    expect(ctx.switchedFromDefault).toBe(false);
    expect(ctx.source).toBe("none");
  });

  it("resolveSqWarehouseContext falls back when default has no WH", async () => {
    const masters = createPartnerWarehouseMasters({
      queryTenant: async (_db, _sql, params) => {
        if (Array.isArray(params) && params[0] === 1) {
          return [];
        }
        if (params == null || (Array.isArray(params) && params.length === 0)) {
          return [{ BPLid: 3, WhsCode: "W3" }];
        }
        return [];
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
      source: "fallback_branch",
      switchedFromDefault: true,
    });
  });

  it("resolveSqWarehouseContext prefers PQ warehouse when found", async () => {
    const masters = createPartnerWarehouseMasters({
      queryTenant: async (_db, sql, params) => {
        if (String(sql).includes("WhsCode") && params?.[0] === "PQ1") {
          return [{ BPLid: 9, WhsCode: "PQ1" }];
        }
        return [{ WhsCode: "DEFAULT-WH" }];
      },
    });
    const ctx = await resolveSqWarehouseContext({
      defaultBranchId: 1,
      pqWarehouseCode: "PQ1",
      sapDbName: "DB",
      warehouseMasters: masters,
    });
    expect(ctx).toEqual({
      branchId: 9,
      branchWarehouseCode: "PQ1",
      source: "pq_warehouse",
      switchedFromDefault: true,
    });
  });

  it("resolveSqWarehouseContext uses any WH when buyer WH missing and no BPL on OWHS", async () => {
    const masters: PartnerWarehouseMasters = {
      getDefaultObplBranch: async () => null,
      getFirstActiveBranchWarehouse: async () => null,
      getFirstActiveWarehouse: async () => ({ branchId: null, warehouseCode: "01" }),
      getWarehouseForBranch: async () => null,
      resolveWarehouseIfExists: async () => null,
    };
    const ctx = await resolveSqWarehouseContext({
      defaultBranchId: null,
      pqWarehouseCode: "L101",
      sapDbName: "AJAX_POS_DB",
      warehouseMasters: masters,
    });
    expect(ctx.branchWarehouseCode).toBe("01");
    expect(ctx.source).toBe("any_warehouse");
    expect(ctx.branchId).toBeNull();
  });
});
