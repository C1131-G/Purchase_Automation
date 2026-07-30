import { Brackets, In } from "typeorm";

import { getCachedData } from "@/core/utils/cache";
import { getTenantRepository, executeTenantQuery } from "@/db/tenant-query";
import { getDisplayCurrency, resolveCurrencyCode } from "@/services/currency-format";
import { AdminSettingsSchema } from "@/db/schemas/admin-settings.schema";
import { ItemPriceSchema } from "@/db/schemas/item-price.schema";
import { ItemWarehouseStockSchema } from "@/db/schemas/item-warehouse-stock.schema";
import { ItemSchema } from "@/db/schemas/item.schema";
import { TaxGroupSchema } from "@/db/schemas/tax-group.schema";
import { UnitOfMeasurementSchema } from "@/db/schemas/unit-of-measurement.schema";

import { toTrimmed } from "./master-data.lookup-cache";
import { mapProductResults } from "./master-data.products-map";

export async function loadProductsForTenant(
  dbName: string,
  normalizedWarehouseCode: string,
  normalizedSearch: string,
  resolvedLimit: number | undefined,
  defaultListLimit: number,
  type: "sales" | "purchase" | undefined,
  priceList: number | undefined,
) {
  // Step 1: Pre-fetch setup data with independent caches so product search misses don't re-fetch static lookups.
  const [adminSettings, taxGroups, uoms, ugpLines] = await Promise.all([
    getCachedData(
      `master:${dbName}:AdminSettings`,
      async () => {
        const repository = await getTenantRepository(dbName, AdminSettingsSchema);
        const rows = await repository.find({
          select: ["Code", "MainCurncy"] as const,
          take: 1,
        });
        return rows[0] ?? null;
      },
      1000 * 60 * 60,
    ),
    getCachedData(
      `master:${dbName}:TaxGroups:active`,
      async () => {
        const repository = await getTenantRepository(dbName, TaxGroupSchema);
        return repository.find({
          select: ["Code", "Rate"] as const,
          where: { Inactive: "N" } as Record<string, unknown>,
        });
      },
      1000 * 60 * 30,
    ),
    getCachedData(
      `master:${dbName}:UoMs`,
      async () => {
        const repository = await getTenantRepository(dbName, UnitOfMeasurementSchema);
        return repository.find({
          select: ["UomEntry", "UomCode", "UomName"] as const,
        });
      },
      1000 * 60 * 60,
    ),
    // Fetch all UoM Group lines (UGP1 joined with OUOM) so each product
    // can expose its full set of valid UoMs, matching what SAP B1 shows.
    getCachedData(
      `master:${dbName}:UgpLines`,
      async () => {
        try {
          const rows = (await executeTenantQuery(
            dbName,
            `SELECT ugp."UgpEntry", ugp."UomEntry", ouom."UomCode", ouom."UomName"
                 FROM UGP1 ugp
                 INNER JOIN OUOM ouom ON ugp."UomEntry" = ouom."UomEntry"
                 WHERE ugp."IsActive" = 'Y'`,
          )) as Array<{
            UgpEntry: unknown;
            UomEntry: unknown;
            UomCode: unknown;
            UomName: unknown;
          }>;
          return rows;
        } catch {
          return [];
        }
      },
      1000 * 60 * 60,
    ),
  ]);

  // Step 2: Fetch Item headers based on search and limit.
  const repository = await getTenantRepository(dbName, ItemSchema);
  const query = repository
    .createQueryBuilder("item")
    .select([
      "item.ItemCode",
      "item.ItemName",
      "item.SalUnitMsr",
      "item.BuyUnitMsr",
      "item.AvgPrice",
      "item.LstEvlPric",
      "item.LastPurPrc",
      "item.LastPurCur",
      "item.VatGroupPu",
      "item.VatGroupSa",
      "item.DfltWH",
      "item.UgpEntry",
    ])
    .where("item.frozenFor = :active", { active: "N" });

  // Filter by item type: sales items only show SellItem='Y', purchase items only show PrchseItem='Y'
  if (type === "sales") {
    query.andWhere("item.SellItem = :sellItem", { sellItem: "Y" });
  } else if (type === "purchase") {
    query.andWhere("item.PrchseItem = :prchseItem", { prchseItem: "Y" });
  }

  if (normalizedSearch) {
    const words = normalizedSearch.split(/\s+/).filter(Boolean);
    words.forEach((word, index) => {
      const lowerWord = word.toLowerCase();
      query.andWhere(
        new Brackets((queryBuilder) => {
          queryBuilder
            .where("LOWER(item.ItemCode) LIKE :word_" + index, {
              ["word_" + index]: `%${lowerWord}%`,
            })
            .orWhere("LOWER(item.ItemName) LIKE :word_" + index, {
              ["word_" + index]: `%${lowerWord}%`,
            });
        }),
      );
    });
  }

  // Default sorting: if no search, sort by ItemCode.
  // Always apply a row cap (browse and search) so product popup never scans full OITM.
  query.orderBy("item.ItemCode", "ASC");
  if (resolvedLimit !== undefined) {
    query.take(resolvedLimit);
  } else {
    query.take(defaultListLimit);
  }

  const items = await query.getMany();
  if (items.length === 0) {
    return [];
  }

  const itemCodes = items.map((item) => toTrimmed(item.ItemCode)).filter(Boolean);

  // Step 3: Fetch related Stock and Price data ONLY for the identified items.
  // This is the CRITICAL optimization that prevents full table scans of OITW and ITM1.
  const [itemStocks, itemPrices] = await Promise.all([
    (async () => {
      const stockRepository = await getTenantRepository(dbName, ItemWarehouseStockSchema);
      const stockQuery = stockRepository
        .createQueryBuilder("stock")
        .select("stock.ItemCode", "ItemCode")
        .addSelect("SUM(stock.OnHand)", "OnHand")
        .where("stock.ItemCode IN (:...itemCodes)", { itemCodes })
        .groupBy("stock.ItemCode");

      if (normalizedWarehouseCode) {
        stockQuery.andWhere("stock.WhsCode = :warehouseCode", {
          warehouseCode: normalizedWarehouseCode,
        });
      }
      return stockQuery.getRawMany<{
        ItemCode?: unknown;
        OnHand?: unknown;
      }>();
    })(),
    (async () => {
      // Special SAP price lists: -1 = Last Purchase Price, -2 = Last Evaluated (AvgPrice).
      // These are not in ITM1 — they come from OITM fields.
      // For any regular price list, filter ITM1 by that PriceList number.
      if (priceList === -1 || priceList === -2) {
        // Will be resolved from item.LastPurPrc or item.AvgPrice directly — no ITM1 query needed.
        return [];
      }
      const priceRepository = await getTenantRepository(dbName, ItemPriceSchema);
      const priceWhere: Record<string, unknown> = {
        ItemCode: In(itemCodes),
      };
      if (priceList !== undefined && priceList >= 0) {
        priceWhere.PriceList = priceList;
      }
      return priceRepository.find({
        select: ["ItemCode", "PriceList", "Price"] as const,
        where: priceWhere,
      });
    })(),
  ]);

  // OADM first; env DEFAULT_CURRENCY_CODE if admin missing/"$" / fails.
  const defaultCurrency = resolveCurrencyCode(
    adminSettings?.MainCurncy,
    await getDisplayCurrency(dbName),
  );

  return mapProductResults({
    items,
    itemStocks,
    itemPrices,
    priceList,
    type,
    defaultCurrency,
    taxGroups,
    uoms,
    ugpLines,
    normalizedWarehouseCode,
  });
}
