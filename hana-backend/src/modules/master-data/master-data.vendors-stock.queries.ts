import { getCachedData } from "@/core/utils/cache";
import { getTenantRepository } from "@/db/tenant-query";
import { getDisplayCurrency, resolveCurrencyCode } from "@/services/currency-format";
import { AdminSettingsSchema } from "@/db/schemas/admin-settings.schema";
import { BusinessPartnerSchema } from "@/db/schemas/business-partner.schema";
import { ItemWarehouseStockSchema } from "@/db/schemas/item-warehouse-stock.schema";
import { WarehouseSchema } from "@/db/schemas/warehouse.schema";

import { fetchLookup, toTrimmed, toNullableInt, toNumberOrZero } from "./master-data.lookup-cache";
import {
  fetchBusinessPartnerAddresses,
  fetchSalesEmployeeNames,
} from "./master-data.partner-lookup";
import { getIcPartnerLookupContext } from "@/modules/intercompany/api/ic-partner-scope";
export const getProductWarehouseStocks = async (dbName: string, itemCode: string) => {
  const normalizedItemCode = toTrimmed(itemCode);
  if (!normalizedItemCode) {
    const error = new Error("itemCode is required") as Error & {
      statusCode?: number;
    };
    error.statusCode = 400;
    throw error;
  }

  const cacheKey = `master:${dbName}:ProductWarehouseStocks:${normalizedItemCode}`;

  return getCachedData(
    cacheKey,
    async () => {
      const [warehouses, stockRows] = await Promise.all([
        fetchLookup(dbName, WarehouseSchema, "Warehouses", {
          order: { WhsCode: "ASC" } as Record<string, "ASC" | "DESC">,
          select: ["WhsCode", "WhsName"] as const,
          where: { Inactive: "N" } as Record<string, unknown>,
        }),
        (async () => {
          const repository = await getTenantRepository(dbName, ItemWarehouseStockSchema);
          return repository.find({
            select: ["WhsCode", "OnHand"] as const,
            where: { ItemCode: normalizedItemCode } as Record<string, unknown>,
          });
        })(),
      ]);

      const stockMap = new Map<string, number>();
      for (const stockRow of stockRows) {
        const whsCode = toTrimmed(stockRow.WhsCode);
        if (!whsCode) {
          continue;
        }
        stockMap.set(whsCode, toNumberOrZero(stockRow.OnHand));
      }

      return warehouses.map((warehouse) => {
        const code = toTrimmed(warehouse.WhsCode);
        return {
          code,
          name: toTrimmed(warehouse.WhsName),
          stock: stockMap.get(code) ?? 0,
        };
      });
    },
    1000 * 60 * 5,
  );
};

/**
 * Batch warehouse stock for many items (document hydrate after first paint).
 * Returns flat rows: { itemCode, code, name, stock }.
 * Optional warehouseCode filters to a single warehouse per item.
 */
export const getProductWarehouseStocksBatch = async (
  dbName: string,
  itemCodes: string[],
  warehouseCode?: string,
) => {
  const codes = [...new Set(itemCodes.map((code) => toTrimmed(code)).filter(Boolean))].slice(
    0,
    100,
  );

  if (codes.length === 0) {
    return [] as Array<{ itemCode: string; code: string; name: string; stock: number }>;
  }

  const normalizedWarehouse = toTrimmed(warehouseCode);
  const codesKey = [...codes].sort().join("|");
  const cacheKey = `master:${dbName}:ProductWarehouseStocksBatch:v1:wh${normalizedWarehouse || "all"}:${codesKey}`;

  return getCachedData(
    cacheKey,
    async () => {
      const [warehouses, stockRows] = await Promise.all([
        fetchLookup(dbName, WarehouseSchema, "Warehouses", {
          order: { WhsCode: "ASC" } as Record<string, "ASC" | "DESC">,
          select: ["WhsCode", "WhsName"] as const,
          where: { Inactive: "N" } as Record<string, unknown>,
        }),
        (async () => {
          const repository = await getTenantRepository(dbName, ItemWarehouseStockSchema);
          const stockQuery = repository
            .createQueryBuilder("stock")
            .select(["stock.ItemCode", "stock.WhsCode", "stock.OnHand"])
            .where("stock.ItemCode IN (:...itemCodes)", { itemCodes: codes });

          if (normalizedWarehouse) {
            stockQuery.andWhere("stock.WhsCode = :warehouseCode", {
              warehouseCode: normalizedWarehouse,
            });
          }

          return stockQuery.getMany();
        })(),
      ]);

      const warehouseNameByCode = new Map<string, string>();
      for (const warehouse of warehouses) {
        const code = toTrimmed(warehouse.WhsCode);
        if (code) {
          warehouseNameByCode.set(code, toTrimmed(warehouse.WhsName));
        }
      }

      // stockMap: itemCode -> whsCode -> onHand
      const stockMap = new Map<string, Map<string, number>>();
      for (const stockRow of stockRows) {
        const itemCode = toTrimmed(stockRow.ItemCode);
        const whsCode = toTrimmed(stockRow.WhsCode);
        if (!itemCode || !whsCode) {
          continue;
        }
        let perWhs = stockMap.get(itemCode);
        if (!perWhs) {
          perWhs = new Map();
          stockMap.set(itemCode, perWhs);
        }
        perWhs.set(whsCode, toNumberOrZero(stockRow.OnHand));
      }

      const rows: Array<{ itemCode: string; code: string; name: string; stock: number }> = [];

      if (normalizedWarehouse) {
        const warehouseName = warehouseNameByCode.get(normalizedWarehouse) ?? normalizedWarehouse;
        for (const itemCode of codes) {
          rows.push({
            itemCode,
            code: normalizedWarehouse,
            name: warehouseName,
            stock: stockMap.get(itemCode)?.get(normalizedWarehouse) ?? 0,
          });
        }
        return rows;
      }

      // All warehouses: emit one row per (item × active warehouse), matching single-item shape.
      for (const itemCode of codes) {
        const perWhs = stockMap.get(itemCode);
        for (const warehouse of warehouses) {
          const code = toTrimmed(warehouse.WhsCode);
          if (!code) {
            continue;
          }
          rows.push({
            itemCode,
            code,
            name: toTrimmed(warehouse.WhsName),
            stock: perWhs?.get(code) ?? 0,
          });
        }
      }
      return rows;
    },
    1000 * 60 * 5,
  );
};

// Fetches active Vendors (Business Partners with type 'S' = Supplier).
// OCRD.CardType is the source of truth ('S' for vendors/suppliers, 'C' for customers).
// OCRD.SlpCode refers to Sales Employee (for customers) or Buyer (for vendors), both joining to OSLP.

export const getVendors = async (dbName: string, scope?: "intercompany") => {
  const icContext =
    scope === "intercompany" ? await getIcPartnerLookupContext(dbName, "purchase") : [];
  const allowedVendorCodes = new Set(icContext.map((item) => item.code));
  const icByCode = new Map(icContext.map((item) => [item.code, item]));
  const [settingsRows, displayCurrency, results] = await Promise.all([
    (async () => {
      const adminSettingsRepo = await getTenantRepository(dbName, AdminSettingsSchema);
      return adminSettingsRepo.find({ select: ["MainCurncy"], take: 1 });
    })(),
    getDisplayCurrency(dbName),
    fetchLookup(dbName, BusinessPartnerSchema, "Vendors:v3", {
      order: { CardCode: "ASC" } as Record<string, "ASC" | "DESC">,
      select: [
        "CardCode",
        "CardName",
        "Address",
        "Currency",
        "SlpCode",
        "BillToDef",
        "ShipToDef",
      ] as const,
      where: { CardType: "S", frozenFor: "N" } as Record<string, unknown>,
    }),
  ]);
  const filteredResults =
    scope === "intercompany"
      ? results.filter((item) => allowedVendorCodes.has(toTrimmed(item.CardCode)))
      : results;
  const adminSettings = settingsRows[0] ?? null;
  // OADM first; env DEFAULT_CURRENCY_CODE if admin missing/"$" / fails.
  const defaultCurrency = resolveCurrencyCode(adminSettings?.MainCurncy, displayCurrency);
  const vendorCodes = filteredResults.map((item) => item.CardCode).filter(Boolean);
  const salesEmployeeCodes = [
    ...new Set(
      filteredResults
        .map((item) => toNullableInt(item.SlpCode))
        .filter((code): code is number => code !== undefined),
    ),
  ];

  const defaultsMap = new Map<string, { billToDef?: string; shipToDef?: string }>();
  for (const item of filteredResults) {
    if (item.CardCode) {
      defaultsMap.set(toTrimmed(item.CardCode), {
        billToDef: item.BillToDef,
        shipToDef: item.ShipToDef,
      });
    }
  }

  // Defaults only — full address lists load via GET /business-partners/:code/addresses.
  const [vendorAddressMap, salesEmployeeMap] = await Promise.all([
    fetchBusinessPartnerAddresses(dbName, vendorCodes, defaultsMap, {
      includeAddressList: false,
    }),
    fetchSalesEmployeeNames(dbName, salesEmployeeCodes),
  ]);

  return filteredResults.map((item) => {
    const normalizedCardCode = toTrimmed(item.CardCode);
    const slpCode = toNullableInt(item.SlpCode);
    const icPartner = icByCode.get(normalizedCardCode);
    return {
      id: normalizedCardCode,
      CardCode: normalizedCardCode,
      CardName: item.CardName,
      Address: item.Address,
      Currency: resolveCurrencyCode(item.Currency, defaultCurrency),
      SlpCode: item.SlpCode,
      // Aliases for frontend components expecting generic keys.
      code: normalizedCardCode,
      name: item.CardName,
      billToAddress: vendorAddressMap.get(normalizedCardCode)?.billToAddress ?? item.Address ?? "",
      shipToAddress:
        vendorAddressMap.get(normalizedCardCode)?.shipToAddress ??
        vendorAddressMap.get(normalizedCardCode)?.billToAddress ??
        item.Address ??
        "",
      salesEmployeeCode: slpCode,
      salesEmployeeName: slpCode !== undefined ? (salesEmployeeMap.get(slpCode) ?? "") : "",
      ...(icPartner
        ? {
            icCompanyCode: icPartner.companyCode,
            icCompanyName: icPartner.companyName,
            defaultWarehouseCode: icPartner.defaultWarehouseCode,
            defaultBranchId: icPartner.defaultBranchId,
          }
        : {}),
    };
  });
};

// Fetches active Customers (Business Partners with type 'C' = Customer).
// OCRD.CardType is the source of truth ('C' for customers, 'S' for vendors/suppliers).
// OCRD.SlpCode refers to Sales Employee (for customers) or Buyer (for vendors), both joining to OSLP.
