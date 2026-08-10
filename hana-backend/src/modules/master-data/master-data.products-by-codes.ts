/**
 * Batch product meta by exact ItemCode list (document hydrate / copy-from).
 * Requires CardCode: only OSCN ∩ OITM codes for that BP are returned.
 */
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
import { MAX_MASTER_DATA_BATCH_CODES, parseItemCodesParam } from "./master-data.batch-utils";

const PRODUCTS_BY_CODES_TTL_MS = 1000 * 60 * 5;

export { parseItemCodesParam, MAX_MASTER_DATA_BATCH_CODES };

export const getProductsByCodes = async (
  dbName: string,
  codes: string[],
  type?: "sales" | "purchase",
  priceList?: number,
  warehouseCode?: string,
  cardCode?: string,
) => {
  const itemCodes = [...new Set(codes.map((code) => toTrimmed(code)).filter(Boolean))].slice(
    0,
    MAX_MASTER_DATA_BATCH_CODES,
  );
  const normalizedCardCode = toTrimmed(cardCode);

  if (itemCodes.length === 0 || !normalizedCardCode) {
    return [];
  }

  const normalizedWarehouseCode = toTrimmed(warehouseCode);
  const typeToken = type || "default";
  const priceListToken = priceList !== undefined ? String(priceList) : "default";
  const codesKey = [...itemCodes].sort().join("|");
  const cacheKey = `master:${dbName}:ProductsByCodes:v2:${typeToken}:pl${priceListToken}:wh${normalizedWarehouseCode || "default"}:bp${normalizedCardCode}:${codesKey}`;

  return getCachedData(
    cacheKey,
    () =>
      loadProductsByCodesForTenant(
        dbName,
        itemCodes,
        type,
        priceList,
        normalizedWarehouseCode,
        normalizedCardCode,
      ),
    PRODUCTS_BY_CODES_TTL_MS,
  );
};

async function loadProductsByCodesForTenant(
  dbName: string,
  itemCodes: string[],
  type: "sales" | "purchase" | undefined,
  priceList: number | undefined,
  normalizedWarehouseCode: string,
  normalizedCardCode: string,
) {
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

  const { oscnByItemCode, itemCodes: matchedCodes } = await loadOscnMatchedItemCodes(
    dbName,
    normalizedCardCode,
    type,
    { itemCodes },
  );

  if (matchedCodes.length === 0) {
    return [];
  }

  const repository = await getTenantRepository(dbName, ItemSchema);
  const items = await repository
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
    .where("item.ItemCode IN (:...itemCodes)", { itemCodes: matchedCodes })
    .andWhere("item.frozenFor = :active", { active: "N" })
    .getMany();

  if (items.length === 0) {
    return [];
  }

  const itemsWithCatalog = items.map((item) => {
    const code = toTrimmed(item.ItemCode);
    const oscn = oscnByItemCode.get(code);
    return {
      ...item,
      ItemName: oscn?.Descriptio || item.ItemName,
      CardCode: oscn?.CardCode ?? normalizedCardCode,
      Substitute: oscn?.Substitute ?? "",
    };
  });

  const foundCodes = itemsWithCatalog.map((item) => toTrimmed(item.ItemCode)).filter(Boolean);

  const [itemStocks, itemPrices] = await Promise.all([
    (async () => {
      const stockRepository = await getTenantRepository(dbName, ItemWarehouseStockSchema);
      const stockQuery = stockRepository
        .createQueryBuilder("stock")
        .select("stock.ItemCode", "ItemCode")
        .addSelect("SUM(stock.OnHand)", "OnHand")
        .where("stock.ItemCode IN (:...itemCodes)", { itemCodes: foundCodes })
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
        ItemCode: In(foundCodes),
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

  const defaultCurrency = resolveCurrencyCode(
    adminSettings?.MainCurncy,
    await getDisplayCurrency(dbName),
  );

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
