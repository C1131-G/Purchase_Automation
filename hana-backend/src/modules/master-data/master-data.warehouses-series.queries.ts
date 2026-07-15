import { logger } from "@/core/logger/pino-logger";
import { getCachedData } from "@/core/utils/cache";
import { getTenantRepository, executeTenantQuery } from "@/db/tenant-query";
import { SalesEmployeeSchema } from "@/db/schemas/sales-employee.schema";
import { WarehouseSchema } from "@/db/schemas/warehouse.schema";

import { fetchLookup, toTrimmed } from "./master-data.lookup-cache";
export const getSeries = async (dbName: string, documentType: string) => {
  const cacheKey = `master:${dbName}:Series:${documentType}`;
  return getCachedData(
    cacheKey,
    async () => {
      try {
        const rows = (await executeTenantQuery(
          dbName,
          `SELECT "Series", "SeriesName", "ObjectCode", "Locked"
           FROM NNM1
           WHERE "ObjectCode" = '${documentType}'
             AND "Locked" = 'N'
           ORDER BY "Series" ASC`,
        )) as Array<{
          Series: unknown;
          SeriesName: unknown;
          ObjectCode: unknown;
          Locked: unknown;
        }>;

        return rows
          .filter((row) => row.SeriesName && String(row.SeriesName).trim())
          .map((row) => ({
            Series: Number(row.Series),
            Name: toTrimmed(row.SeriesName),
            code: String(row.Series ?? ""),
            id: String(row.Series ?? ""),
            name: toTrimmed(row.SeriesName),
          }));
      } catch (err) {
        logger.warn({
          db: dbName,
          documentType,
          err,
          msg: "Failed to fetch series from NNM1",
        });
        return [];
      }
    },
    1000 * 60 * 10,
  );
};

// Lists active warehouses available for inventory storage and transactions.

export const getWarehouses = async (dbName: string) => {
  const results = await fetchLookup(dbName, WarehouseSchema, "Warehouses", {
    order: { WhsCode: "ASC" } as Record<string, "ASC" | "DESC">,
    select: ["WhsCode", "WhsName", "BinActivat"] as const,
    where: { Inactive: "N" } as Record<string, unknown>,
  });

  return results.map((item) => ({
    Code: item.WhsCode,
    Name: item.WhsName,
    code: item.WhsCode,
    id: item.WhsCode,
    name: item.WhsName,
    enableBinLocations: item.BinActivat === "Y",
  }));
};

// Fetches bin locations for a warehouse directly from OBIN via HANA.
// Uses executeTenantQuery — no SAP Service Layer session required.

export const getWarehouseBins = async (dbName: string, warehouseCode: string) => {
  const cacheKey = `master:${dbName}:Bins:${warehouseCode}`;
  return getCachedData(
    cacheKey,
    async () => {
      try {
        const rows = (await executeTenantQuery(
          dbName,
          `SELECT "AbsEntry", "BinCode", "WhsCode", "Descr"
           FROM OBIN
           WHERE "WhsCode" = '${warehouseCode}'
             AND "Disabled" = 'N'
           ORDER BY "BinCode" ASC`,
        )) as Array<{
          AbsEntry: unknown;
          BinCode: unknown;
          WhsCode: unknown;
          Descr: unknown;
        }>;

        return rows.map((row) => ({
          AbsEntry: Number(row.AbsEntry),
          BinCode: String(row.BinCode ?? ""),
          WhsCode: String(row.WhsCode ?? ""),
          Description: toTrimmed(row.Descr),
        }));
      } catch (err) {
        logger.warn({
          db: dbName,
          err,
          msg: "Failed to fetch bins from OBIN",
          warehouseCode,
        });
        return [];
      }
    },
    1000 * 60 * 5, // 5 min cache
  );
};

export const getSalesEmployees = async (dbName: string) => {
  const repository = await getTenantRepository(dbName, SalesEmployeeSchema);
  const rows = await repository.find({
    select: ["SlpCode", "SlpName"] as const,
    where: { Active: "Y" } as Record<string, unknown>,
  });

  return rows.map((row) => ({
    code: String(row.SlpCode),
    name: toTrimmed(row.SlpName) || String(row.SlpCode),
  }));
};

export const getWarehouseBranch = async (dbName: string, warehouseCode: string) => {
  const cacheKey = `master:${dbName}:WarehouseBranch:${warehouseCode}`;
  return getCachedData(
    cacheKey,
    async () => {
      try {
        const rows = (await executeTenantQuery(
          dbName,
          `SELECT "BPLid" FROM OWHS WHERE "WhsCode" = '${warehouseCode}'`,
        )) as Array<{ BPLid: unknown }>;

        if (rows && rows.length > 0 && rows[0].BPLid !== null && rows[0].BPLid !== undefined) {
          return Number(rows[0].BPLid);
        }
        return null;
      } catch (err) {
        logger.warn({
          db: dbName,
          err,
          msg: "Failed to fetch warehouse branch from OWHS",
          warehouseCode,
        });
        return null;
      }
    },
    1000 * 60 * 60, // 1 hour cache
  );
};

export const getDefaultBranch = async (dbName: string) => {
  const cacheKey = `master:${dbName}:DefaultBranch`;
  return getCachedData(
    cacheKey,
    async () => {
      try {
        const rows = (await executeTenantQuery(
          dbName,
          `SELECT TOP 1 "BPLId" FROM OBPL WHERE "Disabled" = 'N' ORDER BY "BPLId" ASC`,
        )) as Array<{ BPLId: unknown }>;

        if (rows && rows.length > 0) {
          return Number(rows[0].BPLId);
        }
        return null;
      } catch (err) {
        logger.warn({ db: dbName, err, msg: "Failed to fetch default branch from OBPL" });
        return null;
      }
    },
    1000 * 60 * 60, // 1 hour cache
  );
};
