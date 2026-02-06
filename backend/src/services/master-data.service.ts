// Master Data Service: Centralized logic for retrieving organizational lookup data (Products, Partners, Tax, etc.) from SAP HANA.

import type { EntitySchema, FindManyOptions, ObjectLiteral } from "typeorm";

import { logger } from "@/core/logger/pino-logger";
import { getCachedData } from "@/core/utils/cache";
import { getTenantRepository } from "@/dal/tenant-dal.helper";
import { BusinessPartnerSchema } from "@/db/schemas/business-partner.schema";
import { ItemSchema } from "@/db/schemas/item.schema";
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

// Fetches the product catalog. Only active (frozenFor = 'N') items are retrieved.
export const getProducts = async (dbName: string) => {
  const results = await fetchLookup(dbName, ItemSchema, "Products", {
    where: { frozenFor: "N" },
    order: { ItemCode: "ASC" } as Record<string, "ASC" | "DESC">,
    select: ["ItemCode", "ItemName", "SalUnitMsr", "AvgPrice", "DfltWH"] as const,
  });

  return results.map((item) => ({
    id: item.ItemCode,
    ItemCode: item.ItemCode,
    ItemName: item.ItemName,
    Uom: item.SalUnitMsr,
    Price: item.AvgPrice,
    Warehouse: item.DfltWH,
    // Maintains compatibility with older frontend components using snake_case.
    productCode: item.ItemCode,
    productName: item.ItemName,
  }));
};

// Fetches active Vendors (Business Partners with type 'S' = Supplier).
export const getVendors = async (dbName: string) => {
  const results = await fetchLookup(dbName, BusinessPartnerSchema, "Vendors", {
    where: { CardType: "S", frozenFor: "N" } as Record<string, unknown>,
    order: { CardCode: "ASC" } as Record<string, "ASC" | "DESC">,
    select: ["CardCode", "CardName", "Address", "Currency"] as const,
  });

  return results.map((item) => ({
    id: item.CardCode,
    CardCode: item.CardCode,
    CardName: item.CardName,
    Address: item.Address,
    Currency: item.Currency,
    // Aliases for frontend components expecting generic keys.
    code: item.CardCode,
    name: item.CardName,
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
  getVendors,
  getCustomers,
  getTaxCodes,
  getUOMs,
  getWarehouses,
};
