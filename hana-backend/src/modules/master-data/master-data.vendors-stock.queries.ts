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

// Fetches active Vendors (Business Partners with type 'S' = Supplier).
// OCRD.CardType is the source of truth ('S' for vendors/suppliers, 'C' for customers).
// OCRD.SlpCode refers to Sales Employee (for customers) or Buyer (for vendors), both joining to OSLP.

export const getVendors = async (dbName: string) => {
  const adminSettingsRepo = await getTenantRepository(dbName, AdminSettingsSchema);
  const settingsRows = await adminSettingsRepo.find({
    select: ["MainCurncy"],
    take: 1,
  });
  const adminSettings = settingsRows[0] ?? null;
  // OADM first; env DEFAULT_CURRENCY_CODE if admin missing/"$" / fails.
  const defaultCurrency = resolveCurrencyCode(
    adminSettings?.MainCurncy,
    await getDisplayCurrency(dbName),
  );

  const results = await fetchLookup(dbName, BusinessPartnerSchema, "Vendors:v3", {
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
  });
  const vendorCodes = results.map((item) => item.CardCode).filter(Boolean);
  const salesEmployeeCodes = [
    ...new Set(
      results
        .map((item) => toNullableInt(item.SlpCode))
        .filter((code): code is number => code !== undefined),
    ),
  ];

  const defaultsMap = new Map<string, { billToDef?: string; shipToDef?: string }>();
  for (const item of results) {
    if (item.CardCode) {
      defaultsMap.set(toTrimmed(item.CardCode), {
        billToDef: item.BillToDef,
        shipToDef: item.ShipToDef,
      });
    }
  }

  const [vendorAddressMap, salesEmployeeMap] = await Promise.all([
    fetchBusinessPartnerAddresses(dbName, vendorCodes, defaultsMap),
    fetchSalesEmployeeNames(dbName, salesEmployeeCodes),
  ]);

  return results.map((item) => {
    const normalizedCardCode = toTrimmed(item.CardCode);
    const slpCode = toNullableInt(item.SlpCode);
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
      addresses: vendorAddressMap.get(normalizedCardCode)?.addresses ?? [],
      salesEmployeeCode: slpCode,
      salesEmployeeName: slpCode !== undefined ? (salesEmployeeMap.get(slpCode) ?? "") : "",
    };
  });
};

// Fetches active Customers (Business Partners with type 'C' = Customer).
// OCRD.CardType is the source of truth ('C' for customers, 'S' for vendors/suppliers).
// OCRD.SlpCode refers to Sales Employee (for customers) or Buyer (for vendors), both joining to OSLP.
