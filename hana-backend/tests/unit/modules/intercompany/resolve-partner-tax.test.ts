import { describe, expect, it } from "vitest";

import { createCompanyQueries } from "@/modules/intercompany/config/company/company.queries";
import { createCompanyService } from "@/modules/intercompany/config/company/company.service";
import { createPartnerTaxResolver } from "@/modules/intercompany/config/tax-mapping/resolve-partner-tax.service";
import type { PartnerTaxMasters } from "@/modules/intercompany/config/tax-mapping/partner-tax.masters";
import {
  OVTG_CATEGORY_PURCHASE,
  OVTG_CATEGORY_SALES,
} from "@/modules/intercompany/config/tax-mapping/map-ovtg-partner-tax";
import {
  createMemoryDb,
  createMemorySqlClient,
  seedMemoryCompanyGraph,
} from "@/modules/intercompany/testing/memory-sql";

describe("resolvePartnerTax (OVTG rate + fallbacks)", () => {
  const emptyOvtg = {
    getOvtgTax: async () => null,
    listOvtgTaxes: async () => [],
  };

  const setup = (masters: {
    getItemTax: (db: string, item: string, side: "sales" | "purchase") => Promise<string | null>;
    getBpTax: (db: string, card: string, side: "sales" | "purchase") => Promise<string | null>;
    getOvtgTax?: PartnerTaxMasters["getOvtgTax"];
    listOvtgTaxes?: PartnerTaxMasters["listOvtgTaxes"];
  }) => {
    const db = createMemoryDb();
    seedMemoryCompanyGraph(db);
    const sql = createMemorySqlClient(db);
    const company = createCompanyService(createCompanyQueries(sql));
    const resolver = createPartnerTaxResolver({
      company,
      masters: {
        ...emptyOvtg,
        ...masters,
      },
    });
    return { resolver };
  };

  it("maps buyer purchase OVTG rate to seller sales OVTG (PQ→SQ)", async () => {
    const { resolver } = setup({
      getBpTax: async () => null,
      getItemTax: async () => "SHOULD-NOT-USE",
      getOvtgTax: async (_db, code) =>
        code === "IN-12.5"
          ? { category: OVTG_CATEGORY_PURCHASE, code: "IN-12.5", rate: 12.5 }
          : null,
      listOvtgTaxes: async (db) =>
        db === "DB_B" ? [{ category: OVTG_CATEGORY_SALES, code: "OUT-12.5", rate: 12.5 }] : [],
    });

    const result = await resolver.resolve({
      docSide: "sales",
      itemCode: "SKU1",
      sourceCompanyId: 1,
      sourceTaxCode: "IN-12.5",
      targetCardCode: "C-A-ON-B",
      targetCompanyId: 2,
    });

    expect(result).toEqual({ docSide: "sales", source: "ovtg_rate", taxCode: "OUT-12.5" });
  });

  it("uses seller item sales tax when OVTG rate match misses", async () => {
    const { resolver } = setup({
      getBpTax: async () => "BP-TAX",
      getItemTax: async (_db, item, side) => (side === "sales" && item === "SKU1" ? "SA-18" : null),
    });

    const result = await resolver.resolve({
      docSide: "sales",
      itemCode: "SKU1",
      targetCardCode: "C-A-ON-B",
      targetCompanyId: 2,
    });

    expect(result).toEqual({ docSide: "sales", source: "item", taxCode: "SA-18" });
  });

  it("falls back to BP tax when item has no sales tax", async () => {
    const { resolver } = setup({
      getBpTax: async (_db, card, side) =>
        side === "sales" && card === "C-A-ON-B" ? "CUST-TAX" : null,
      getItemTax: async () => null,
    });

    const result = await resolver.resolve({
      docSide: "sales",
      itemCode: "SKU1",
      targetCardCode: "C-A-ON-B",
      targetCompanyId: 2,
    });

    expect(result).toEqual({ docSide: "sales", source: "bp", taxCode: "CUST-TAX" });
  });

  it("omits when OVTG/item/BP miss — never copies buyer tax code verbatim", async () => {
    const { resolver } = setup({
      getBpTax: async () => null,
      getItemTax: async () => null,
    });

    const result = await resolver.resolve({
      docSide: "sales",
      itemCode: "SKU1",
      sourceCompanyId: 1,
      sourceTaxCode: "BUYER-ONLY",
      targetCardCode: "C-A-ON-B",
      targetCompanyId: 2,
    });

    expect(result).toEqual({ docSide: "sales", source: "omit", taxCode: "" });
    expect(result.taxCode).not.toBe("BUYER-ONLY");
  });

  it("uses purchase item column when docSide is purchase", async () => {
    const { resolver } = setup({
      getBpTax: async () => null,
      getItemTax: async (_db, item, side) => {
        if (side === "purchase" && item === "SKU1") {
          return "PU-12";
        }
        if (side === "sales" && item === "SKU1") {
          return "SA-18";
        }
        return null;
      },
    });

    const purchase = await resolver.resolve({
      docSide: "purchase",
      itemCode: "SKU1",
      targetCompanyId: 1,
    });
    const sales = await resolver.resolve({
      docSide: "sales",
      itemCode: "SKU1",
      targetCompanyId: 2,
    });

    expect(purchase.taxCode).toBe("PU-12");
    expect(sales.taxCode).toBe("SA-18");
  });

  it("caches item master lookups within resolver instance", async () => {
    let itemCalls = 0;
    const { resolver } = setup({
      getBpTax: async () => null,
      getItemTax: async () => {
        itemCalls += 1;
        return "CACHED";
      },
    });

    await resolver.resolveLineTax({
      docSide: "sales",
      itemCode: "SKU1",
      targetCompanyId: 2,
    });
    await resolver.resolveLineTax({
      docSide: "sales",
      itemCode: "SKU1",
      targetCompanyId: 2,
    });

    expect(itemCalls).toBe(1);
  });
});
