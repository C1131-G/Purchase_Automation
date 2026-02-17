// Master Data Service: Centralized logic for retrieving organizational lookup data (Products, Partners, Tax, etc.) from SAP HANA.

import { type EntitySchema, type FindManyOptions, In, type ObjectLiteral } from "typeorm";

import { logger } from "@/core/logger/pino-logger";
import { getCachedData } from "@/core/utils/cache";
import { getTenantRepository } from "@/dal/tenant-dal.helper";
import { AdminSettingsSchema } from "@/db/schemas/admin-settings.schema";
import { BusinessPartnerSchema } from "@/db/schemas/business-partner.schema";
import {
  type BusinessPartnerAddress,
  BusinessPartnerAddressSchema,
} from "@/db/schemas/business-partner-address.schema";
import { ItemSchema } from "@/db/schemas/item.schema";
import { ItemPriceSchema } from "@/db/schemas/item-price.schema";
import { ItemWarehouseStockSchema } from "@/db/schemas/item-warehouse-stock.schema";
import { TaxGroupSchema } from "@/db/schemas/tax-group.schema";
import { UnitOfMeasurementSchema } from "@/db/schemas/unit-of-measurement.schema";
import { WarehouseSchema } from "@/db/schemas/warehouse.schema";

// Generic helper function that wraps TypeORM repository lookups with a tenant-aware caching layer.
const fetchLookup = async <T extends ObjectLiteral>(
  dbName: string,
  Schema: EntitySchema<T>,
  entityName: string,
  options: FindManyOptions<T> = {},
): Promise<T[]> => {
  const cacheKey = `master:${dbName}:${entityName}`;

  // Master data changes infrequently in SAP, so a 10-minute cache TTL is used to minimize database load.
  return getCachedData(
    cacheKey,
    async () => {
      try {
        const repository = await getTenantRepository(dbName, Schema);
        const results = await repository.find(options);
        logger.info({ msg: `Lookups fetched: ${entityName}`, count: results?.length });
        return results || [];
      } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error(String(err));
        logger.error({
          msg: `Failed to fetch ${entityName} from HANA`,
          error: error.message,
          db: dbName,
        });
        const dbError = new Error(`Failed to retrieve ${entityName}: ${error.message}`) as Error & {
          statusCode?: number;
        };
        dbError.statusCode = 500;
        throw dbError;
      }
    },
    1000 * 60 * 10,
  );
};

const toTrimmed = (value: unknown): string => (typeof value === "string" ? value.trim() : "");
const toNumberOrZero = (value: unknown): number => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const normalized = value.replaceAll(",", "").trim();
    if (!normalized) return 0;
    const parsedFromString = Number(normalized);
    return Number.isFinite(parsedFromString) ? parsedFromString : 0;
  }
  if (value && typeof value === "object") {
    const rawString = String(value).trim();
    if (rawString && rawString !== "[object Object]") {
      const parsedFromObjectString = Number(rawString);
      if (Number.isFinite(parsedFromObjectString)) return parsedFromObjectString;
    }
    const record = value as Record<string, unknown>;
    const nested = record.value ?? record.Value ?? record.amount ?? record.Amount;
    if (nested !== undefined) return toNumberOrZero(nested);
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatAddress = (row: BusinessPartnerAddress): string => {
  const parts = [
    toTrimmed(row.Street),
    toTrimmed(row.Block),
    toTrimmed(row.City),
    toTrimmed(row.State),
    toTrimmed(row.ZipCode),
    toTrimmed(row.Country),
  ].filter(Boolean);

  if (parts.length > 0) return parts.join(", ");
  return toTrimmed(row.Address);
};

const fetchVendorAddresses = async (dbName: string, vendorCodes: string[]) => {
  if (vendorCodes.length === 0) {
    return new Map<string, { billToAddress?: string; shipToAddress?: string }>();
  }

  const repository = await getTenantRepository(dbName, BusinessPartnerAddressSchema);
  const rows = await repository.find({
    where: {
      CardCode: In(vendorCodes),
      AdresType: In(["B", "S"]),
    } as Record<string, unknown>,
    order: { CardCode: "ASC" } as Record<string, "ASC" | "DESC">,
    select: [
      "CardCode",
      "AdresType",
      "Address",
      "Street",
      "Block",
      "City",
      "ZipCode",
      "State",
      "Country",
    ] as const,
  });
  const addressMap = new Map<string, { billToAddress?: string; shipToAddress?: string }>();

  for (const row of rows) {
    const cardCode = toTrimmed(row.CardCode);
    const addressType = toTrimmed(row.AdresType).toUpperCase();
    if (!cardCode || (addressType !== "B" && addressType !== "S")) continue;

    const formattedAddress = formatAddress(row);
    if (!formattedAddress) continue;

    const current = addressMap.get(cardCode) ?? {};
    if (addressType === "B" && !current.billToAddress) current.billToAddress = formattedAddress;
    if (addressType === "S" && !current.shipToAddress) current.shipToAddress = formattedAddress;
    addressMap.set(cardCode, current);
  }

  return addressMap;
};

// Fetches the product catalog with warehouse-aware stock.
export const getProducts = async (
  dbName: string,
  warehouseCode?: string,
  search?: string,
  limit?: number,
) => {
  const normalizedWarehouseCode = toTrimmed(warehouseCode);
  const normalizedSearch = toTrimmed(search).toLowerCase();
  const resolvedLimit =
    typeof limit === "number" && Number.isFinite(limit)
      ? Math.max(1, Math.min(500, limit))
      : undefined;
  const defaultListLimit = 100;
  const cacheLimitToken = normalizedSearch
    ? resolvedLimit !== undefined
      ? String(resolvedLimit)
      : "unlimited"
    : String(resolvedLimit ?? defaultListLimit);
  const cacheKey = `master:${dbName}:Products:v7:${normalizedWarehouseCode || "default"}:${normalizedSearch || "all"}:${cacheLimitToken}`;

  return getCachedData(
    cacheKey,
    async () => {
      const [items, itemStocks, itemPrices, adminSettings, taxGroups] = await Promise.all([
        (async () => {
          const repository = await getTenantRepository(dbName, ItemSchema);
          const query = repository
            .createQueryBuilder("item")
            .select([
              "item.ItemCode",
              "item.ItemName",
              "item.SalUnitMsr",
              "item.AvgPrice",
              "item.LastPurCur",
              "item.VatGroupPu",
              "item.VatGourpSa",
              "item.DfltWH",
            ])
            .where("item.frozenFor = :active", { active: "N" })
            .orderBy("item.ItemCode", "ASC");

          if (normalizedSearch) {
            query.andWhere(
              "(LOWER(item.ItemCode) LIKE :search OR LOWER(item.ItemName) LIKE :search)",
              {
                search: `%${normalizedSearch}%`,
              },
            );
            if (resolvedLimit !== undefined) {
              query.take(resolvedLimit);
            }
          }

          return query.getMany();
        })(),
        (async () => {
          const repository = await getTenantRepository(dbName, ItemWarehouseStockSchema);
          const query = repository
            .createQueryBuilder("stock")
            .select("stock.ItemCode", "ItemCode")
            .addSelect("SUM(stock.OnHand)", "OnHand")
            .groupBy("stock.ItemCode");
          if (normalizedWarehouseCode) {
            query.where("stock.WhsCode = :warehouseCode", {
              warehouseCode: normalizedWarehouseCode,
            });
          }
          return query.getRawMany<{ ItemCode?: unknown; OnHand?: unknown }>();
        })(),
        (async () => {
          const repository = await getTenantRepository(dbName, ItemPriceSchema);
          return repository.find({
            select: ["ItemCode", "Price"] as const,
          });
        })(),
        (async () => {
          const repository = await getTenantRepository(dbName, AdminSettingsSchema);
          const rows = await repository.find({
            select: ["Code", "MainCurncy"] as const,
            take: 1,
          });
          return rows[0] ?? null;
        })(),
        (async () => {
          const repository = await getTenantRepository(dbName, TaxGroupSchema);
          return repository.find({
            where: { Inactive: "N" } as Record<string, unknown>,
            select: ["Code", "Rate"] as const,
          });
        })(),
      ]);

      const itemCodes = items.map((item) => toTrimmed(item.ItemCode)).filter(Boolean);
      const itemCodeSet = new Set(itemCodes);

      const stockMap = new Map<string, number>();
      for (const stockRow of itemStocks) {
        const itemCode = toTrimmed(stockRow.ItemCode);
        if (!itemCode || !itemCodeSet.has(itemCode)) continue;
        stockMap.set(itemCode, toNumberOrZero(stockRow.OnHand));
      }

      const priceMap = new Map<string, number>();
      for (const priceRow of itemPrices) {
        const itemCode = toTrimmed(priceRow.ItemCode);
        if (!itemCode || !itemCodeSet.has(itemCode)) continue;
        const candidatePrice = toNumberOrZero(priceRow.Price);
        const currentPrice = priceMap.get(itemCode) ?? 0;
        if (candidatePrice > currentPrice) {
          priceMap.set(itemCode, candidatePrice);
        }
      }

      const defaultCurrency = toTrimmed(adminSettings?.MainCurncy);
      const taxRateByCode = new Map<string, number>();
      for (const taxGroup of taxGroups) {
        const code = toTrimmed(taxGroup.Code);
        if (!code) continue;
        taxRateByCode.set(code, toNumberOrZero(taxGroup.Rate));
      }

      const mappedItems = items.map((item) => {
        const normalizedItemCode = toTrimmed(item.ItemCode);
        const resolvedStock = stockMap.get(normalizedItemCode) ?? 0;
        const resolvedPrice = priceMap.get(normalizedItemCode) ?? toNumberOrZero(item.AvgPrice);
        const resolvedCurrency = defaultCurrency || "";
        const resolvedTaxCode = toTrimmed(item.VatGroupPu) || toTrimmed(item.VatGourpSa);
        const resolvedTaxRate = taxRateByCode.get(resolvedTaxCode) ?? 0;

        return {
          id: normalizedItemCode,
          ItemCode: normalizedItemCode,
          ItemName: item.ItemName,
          Uom: item.SalUnitMsr,
          Price: resolvedPrice,
          Warehouse: normalizedWarehouseCode || item.DfltWH || "",
          OnHand: resolvedStock,
          Currency: resolvedCurrency,
          TaxCode: resolvedTaxCode,
          TaxRate: resolvedTaxRate,
          // Maintains compatibility with older frontend components using snake_case.
          productCode: normalizedItemCode,
          productName: item.ItemName,
          stock: resolvedStock,
          taxCode: resolvedTaxCode,
          taxRate: resolvedTaxRate,
        };
      });

      if (!normalizedSearch) {
        mappedItems.sort((a, b) => {
          const stockDiff = toNumberOrZero(b.OnHand) - toNumberOrZero(a.OnHand);
          if (stockDiff !== 0) return stockDiff;
          return String(a.ItemCode).localeCompare(String(b.ItemCode));
        });
      }

      if (normalizedSearch) {
        return resolvedLimit !== undefined ? mappedItems.slice(0, resolvedLimit) : mappedItems;
      }

      return mappedItems.slice(0, resolvedLimit ?? defaultListLimit);
    },
    1000 * 60 * 10,
  );
};

export const getProductWarehouseStocks = async (dbName: string, itemCode: string) => {
  const normalizedItemCode = toTrimmed(itemCode);
  if (!normalizedItemCode) {
    const error = new Error("itemCode is required") as Error & { statusCode?: number };
    error.statusCode = 400;
    throw error;
  }

  const cacheKey = `master:${dbName}:ProductWarehouseStocks:${normalizedItemCode}`;

  return getCachedData(
    cacheKey,
    async () => {
      const [warehouses, stockRows] = await Promise.all([
        fetchLookup(dbName, WarehouseSchema, "Warehouses", {
          where: { Inactive: "N" } as Record<string, unknown>,
          order: { WhsCode: "ASC" } as Record<string, "ASC" | "DESC">,
          select: ["WhsCode", "WhsName"] as const,
        }),
        (async () => {
          const repository = await getTenantRepository(dbName, ItemWarehouseStockSchema);
          return repository.find({
            where: { ItemCode: normalizedItemCode } as Record<string, unknown>,
            select: ["WhsCode", "OnHand"] as const,
          });
        })(),
      ]);

      const stockMap = new Map<string, number>();
      for (const stockRow of stockRows) {
        const whsCode = toTrimmed(stockRow.WhsCode);
        if (!whsCode) continue;
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
export const getVendors = async (dbName: string) => {
  const results = await fetchLookup(dbName, BusinessPartnerSchema, "Vendors", {
    where: { CardType: "S", frozenFor: "N" } as Record<string, unknown>,
    order: { CardCode: "ASC" } as Record<string, "ASC" | "DESC">,
    select: ["CardCode", "CardName", "Address", "Currency"] as const,
  });
  const vendorCodes = results.map((item) => item.CardCode).filter(Boolean);
  const vendorAddressMap = await fetchVendorAddresses(dbName, vendorCodes);

  return results.map((item) => ({
    id: item.CardCode,
    CardCode: item.CardCode,
    CardName: item.CardName,
    Address: item.Address,
    Currency: item.Currency,
    // Aliases for frontend components expecting generic keys.
    code: item.CardCode,
    name: item.CardName,
    billToAddress: vendorAddressMap.get(item.CardCode)?.billToAddress ?? item.Address ?? "",
    shipToAddress: vendorAddressMap.get(item.CardCode)?.shipToAddress ?? item.Address ?? "",
  }));
};

// Fetches active Customers (Business Partners with type 'C' = Customer).
export const getCustomers = async (dbName: string) => {
  const results = await fetchLookup(dbName, BusinessPartnerSchema, "Customers", {
    where: { CardType: "C", frozenFor: "N" } as Record<string, unknown>,
    order: { CardCode: "ASC" } as Record<string, "ASC" | "DESC">,
    select: ["CardCode", "CardName", "Address", "Currency"] as const,
  });

  return results.map((item) => ({
    id: item.CardCode,
    CardCode: item.CardCode,
    CardName: item.CardName,
    Address: item.Address,
    Currency: item.Currency,
    code: item.CardCode,
    name: item.CardName,
  }));
};

// Retrieves active tax groups (VAT types/rates) defined in SAP.
export const getTaxCodes = async (dbName: string) => {
  const results = await fetchLookup(dbName, TaxGroupSchema, "Tax Codes", {
    where: { Inactive: "N" } as Record<string, unknown>,
    order: { Code: "ASC" } as Record<string, "ASC" | "DESC">,
    select: ["Code", "Name", "Rate"] as const,
  });

  return results.map((item) => ({
    id: item.Code,
    Code: item.Code,
    Name: item.Name,
    Rate: item.Rate,
    code: item.Code,
    name: item.Name,
  }));
};

// Fetches the global list of Units of Measurement (UoM).
export const getUOMs = async (dbName: string) => {
  const results = await fetchLookup(dbName, UnitOfMeasurementSchema, "UOMs", {
    order: { UomCode: "ASC" } as Record<string, "ASC" | "DESC">,
    select: ["UomCode", "UomName"] as const,
  });

  return results.map((item) => ({
    id: item.UomCode,
    Code: item.UomCode,
    Name: item.UomName,
    code: item.UomCode,
    name: item.UomName,
  }));
};

// Lists active warehouses available for inventory storage and transactions.
export const getWarehouses = async (dbName: string) => {
  const results = await fetchLookup(dbName, WarehouseSchema, "Warehouses", {
    where: { Inactive: "N" } as Record<string, unknown>,
    order: { WhsCode: "ASC" } as Record<string, "ASC" | "DESC">,
    select: ["WhsCode", "WhsName"] as const,
  });

  return results.map((item) => ({
    id: item.WhsCode,
    Code: item.WhsCode,
    Name: item.WhsName,
    code: item.WhsCode,
    name: item.WhsName,
  }));
};

export const masterDataService = {
  getProducts,
  getProductWarehouseStocks,
  getVendors,
  getCustomers,
  getTaxCodes,
  getUOMs,
  getWarehouses,
};
