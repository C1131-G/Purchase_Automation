import { In } from "typeorm";

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
import { loadOscnMatchedItemCodes } from "./master-data.oscn";
import { mapProductResults } from "./master-data.products-map";

export async function loadProductsForTenant(
  dbName: string,
  normalizedWarehouseCode: string,
  normalizedSearch: string,
  resolvedLimit: number | undefined,
  defaultListLimit: number,
  type: "sales" | "purchase" | undefined,
  priceList: number | undefined,
  cardCode?: string,
) {
  // Strict catalog: no CardCode → no full OITM browse (empty list).
  const normalizedCardCode = toTrimmed(cardCode);
  if (!normalizedCardCode) {
    return [];
  }

  const rowLimit =
    typeof resolvedLimit === "number" && Number.isFinite(resolvedLimit) && resolvedLimit > 0
      ? Math.floor(resolvedLimit)
      : defaultListLimit;

  // Product catalog, currency, and setup lookups are independent. Start them together
  // so an uncached product request pays for one parallel batch instead of a waterfall.
  const [adminSettings, taxGroups, uoms, ugpLines, displayCurrency, catalog] = await Promise.all([
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
    getDisplayCurrency(dbName),
    loadOscnMatchedItemCodes(dbName, normalizedCardCode, type, {
      search: normalizedSearch,
      // Load a wider OSCN∩OITM page then map; search may filter in-memory on OSCN fields.
      limit: Math.max(rowLimit, defaultListLimit),
    }),
  ]);

  // OSCN for BP → ItemCodes, then OITM for those codes only (no full item master).
  const { oscnByItemCode, itemCodes: matchedCodes } = catalog;

  if (matchedCodes.length === 0) {
    return [];
  }

  const limitedCodes = matchedCodes.slice(0, rowLimit);

  const repository = await getTenantRepository(dbName, ItemSchema);
  const items = await repository
    .createQueryBuilder("item")
    .select([
      "item.ItemCode",
      "item.ItemName",
      "item.FrgnName",
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
      "item.ManBtchNum",
      "item.ManSerNum",
    ])
    .where("item.ItemCode IN (:...itemCodes)", { itemCodes: limitedCodes })
    .andWhere("item.frozenFor = :active", { active: "N" })
    .orderBy("item.ItemCode", "ASC")
    .getMany();

  if (items.length === 0) {
    return [];
  }

  // OSCN only filters which ItemCodes apply to the BP. Name/UoM/tax/price stay
  // current-company OITM (login AJAX → AJAX item master; login RCM → RCM OITM).
  const itemsWithCatalog = items.map((item) => {
    const code = toTrimmed(item.ItemCode);
    const oscn = oscnByItemCode.get(code);
    return {
      ...item,
      ItemName: item.ItemName,
      CardCode: oscn?.CardCode ?? normalizedCardCode,
      Substitute: oscn?.Substitute ?? "",
    };
  });

  const itemCodes = itemsWithCatalog.map((item) => toTrimmed(item.ItemCode)).filter(Boolean);

  // Step 3: Stock and price only for catalog items.
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
      if (priceList === -1 || priceList === -2) {
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

  const defaultCurrency = resolveCurrencyCode(adminSettings?.MainCurncy, displayCurrency);

  return mapProductResults({
    items: itemsWithCatalog,
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
