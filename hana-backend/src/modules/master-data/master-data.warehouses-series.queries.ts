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
        // Prefer NextNumber so clients can show SAP's next DocNum for each series.
        const rows = (await executeTenantQuery(
          dbName,
          `SELECT "Series", "SeriesName", "ObjectCode", "Locked", "NextNumber"
           FROM NNM1
           WHERE "ObjectCode" = '${documentType}'
             AND "Locked" = 'N'
           ORDER BY "Series" ASC`,
        )) as Array<{
          Series: unknown;
          SeriesName: unknown;
          ObjectCode: unknown;
          Locked: unknown;
          NextNumber: unknown;
        }>;

        return rows
          .filter((row) => row.SeriesName && String(row.SeriesName).trim())
          .map((row) => {
            const nextRaw = Number(row.NextNumber);
            return {
              Series: Number(row.Series),
              Name: toTrimmed(row.SeriesName),
              NextNumber: Number.isFinite(nextRaw) && nextRaw > 0 ? Math.trunc(nextRaw) : null,
              code: String(row.Series ?? ""),
              id: String(row.Series ?? ""),
              name: toTrimmed(row.SeriesName),
            };
          });
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

export type ResolvedDocumentSeries = {
  series: number;
  seriesName: string | null;
  nextNumber: number | null;
  /** How the series was chosen. */
  source: "payload" | "branch" | "company_default";
};

/**
 * Pick the SAP numbering series for a marketing document so DocNum follows NNM1.NextNumber.
 * Prefer an unlocked non-manual series for the document branch (NNM1.BPLId) when present;
 * otherwise company default series for the object type.
 *
 * Object codes: SQ=23, PQ=23 drafts share series with finals in some DBs, PO=22, etc.
 */
export const resolveDocumentSeries = async (
  dbName: string,
  objectCode: string,
  options?: { branchId?: number | null; payloadSeries?: unknown },
): Promise<ResolvedDocumentSeries | null> => {
  const payloadSeries = Number(options?.payloadSeries);
  if (Number.isFinite(payloadSeries) && payloadSeries > 0) {
    return {
      nextNumber: null,
      series: Math.trunc(payloadSeries),
      seriesName: null,
      source: "payload",
    };
  }

  const db = dbName.trim();
  const obj = String(objectCode ?? "").trim();
  if (!db || !obj) {
    return null;
  }

  const branchId =
    options?.branchId != null && Number.isFinite(Number(options.branchId))
      ? Math.trunc(Number(options.branchId))
      : null;

  const mapRow = (
    row: Record<string, unknown> | undefined,
    source: ResolvedDocumentSeries["source"],
  ): ResolvedDocumentSeries | null => {
    if (!row) {
      return null;
    }
    const series = Math.trunc(Number(row.Series ?? row.series));
    if (!Number.isFinite(series) || series <= 0) {
      return null;
    }
    const nextRaw = Number(row.NextNumber ?? row.nextNumber);
    return {
      nextNumber: Number.isFinite(nextRaw) && nextRaw > 0 ? Math.trunc(nextRaw) : null,
      series,
      seriesName: toTrimmed(row.SeriesName ?? row.seriesName) || null,
      source,
    };
  };

  // Multi-branch: prefer series bound to document BPL (when NNM1.BPLId exists).
  if (branchId != null && branchId > 0) {
    try {
      const rows = (await executeTenantQuery(
        db,
        `SELECT TOP 1 "Series", "SeriesName", "NextNumber"
           FROM NNM1
          WHERE "ObjectCode" = ?
            AND "Locked" = 'N'
            AND ("IsManual" = 'N' OR "IsManual" IS NULL)
            AND "BPLId" = ?
          ORDER BY "Series" ASC`,
        [obj, branchId],
      )) as Array<Record<string, unknown>>;
      const matched = mapRow(rows[0], "branch");
      if (matched) {
        return matched;
      }
    } catch {
      // BPLId / IsManual may be missing on older DBs — fall through to company default.
    }
  }

  try {
    const rows = (await executeTenantQuery(
      db,
      `SELECT TOP 1 "Series", "SeriesName", "NextNumber"
         FROM NNM1
        WHERE "ObjectCode" = ?
          AND "Locked" = 'N'
          AND ("IsManual" = 'N' OR "IsManual" IS NULL)
        ORDER BY "Series" ASC`,
      [obj],
    )) as Array<Record<string, unknown>>;
    return mapRow(rows[0], "company_default");
  } catch (err) {
    logger.warn({
      branchId,
      db,
      err,
      msg: "Failed to resolve document series from NNM1",
      objectCode: obj,
    });
    return null;
  }
};

/** Seller sales (mother) UoM for an item — OITM.SalUnitMsr + OUOM.UomEntry. */
export const resolveItemSalesUom = async (
  dbName: string,
  itemCode: string,
): Promise<{ uomCode: string; uomEntry: number | null } | null> => {
  const db = dbName.trim();
  const code = itemCode.trim();
  if (!db || !code) {
    return null;
  }
  try {
    const rows = (await executeTenantQuery(
      db,
      `SELECT TOP 1 i."SalUnitMsr" AS "UomCode", ouom."UomEntry" AS "UomEntry"
         FROM "OITM" i
         LEFT JOIN "OUOM" ouom ON ouom."UomCode" = i."SalUnitMsr"
        WHERE i."ItemCode" = ?`,
      [code],
    )) as Array<Record<string, unknown>>;
    const uomCode = toTrimmed(rows[0]?.UomCode ?? rows[0]?.uomCode);
    if (!uomCode) {
      return null;
    }
    const entryRaw = Number(rows[0]?.UomEntry ?? rows[0]?.uomEntry);
    return {
      uomCode,
      uomEntry: Number.isFinite(entryRaw) && entryRaw > 0 ? Math.trunc(entryRaw) : null,
    };
  } catch (err) {
    logger.warn({
      db,
      err,
      itemCode: code,
      msg: "Failed to resolve item sales UoM from OITM",
    });
    return null;
  }
};

/**
 * Resolve OUOM.UomEntry for a UoM code (or name) on a tenant DB.
 * Required when posting SQ/AR with UoMCode only — without UoMEntry SAP often shows Manual.
 */
export const resolveUomEntryByCode = async (
  dbName: string,
  uomCode: string,
): Promise<number | null> => {
  const resolved = await resolveUomOnTenant(dbName, { uomCode });
  return resolved?.uomEntry ?? null;
};

export type ResolvedTenantUom = {
  uomCode: string;
  uomEntry: number | null;
};

/**
 * Resolve a line UoM on a specific SAP company DB (seller for IC SQ/AR).
 * Buyer UoMEntry is not portable across companies — always re-resolve here.
 *
 * Order:
 * 1) Item UoM group (UGP1) match by UoM code/name
 * 2) Global OUOM by code/name
 * 3) Item sales UoM (SalUnitMsr) when preferred code missing/unusable
 */
export const resolveUomOnTenant = async (
  dbName: string,
  params: { itemCode?: string | null; uomCode?: string | null },
): Promise<ResolvedTenantUom | null> => {
  const db = dbName.trim();
  const preferred = String(params.uomCode ?? "").trim();
  const itemCode = String(params.itemCode ?? "").trim();
  if (!db) {
    return null;
  }
  // Unit tests use memory IC SQL only — never open real tenant HANA for OUOM.
  if (process.env.VITEST === "true" || process.env.NODE_ENV === "test") {
    return null;
  }

  const toResolved = (row: Record<string, unknown> | undefined): ResolvedTenantUom | null => {
    if (!row) {
      return null;
    }
    const code = toTrimmed(row.UomCode ?? row.uomCode);
    const entryRaw = Number(row.UomEntry ?? row.uomEntry);
    const uomEntry = Number.isFinite(entryRaw) && entryRaw > 0 ? Math.trunc(entryRaw) : null;
    if (!code && uomEntry == null) {
      return null;
    }
    return { uomCode: code || preferred, uomEntry };
  };

  try {
    // 1) Prefer UoM that belongs to the item's UoM group on this company.
    if (itemCode && preferred) {
      const groupRows = (await executeTenantQuery(
        db,
        `SELECT TOP 1 ouom."UomEntry" AS "UomEntry", ouom."UomCode" AS "UomCode"
           FROM "OITM" i
           INNER JOIN "UGP1" ugp ON ugp."UgpEntry" = i."UgpEntry"
           INNER JOIN "OUOM" ouom ON ouom."UomEntry" = ugp."UomEntry"
          WHERE i."ItemCode" = ?
            AND i."UgpEntry" IS NOT NULL
            AND i."UgpEntry" > 0
            AND (
              UPPER(TRIM(ouom."UomCode")) = UPPER(?)
              OR UPPER(TRIM(IFNULL(ouom."UomName", ''))) = UPPER(?)
            )`,
        [itemCode, preferred, preferred],
      )) as Array<Record<string, unknown>>;
      const fromGroup = toResolved(groupRows[0]);
      if (fromGroup?.uomEntry != null) {
        return fromGroup;
      }
    }

    // 2) Global OUOM by code or name.
    if (preferred) {
      const ouomRows = (await executeTenantQuery(
        db,
        `SELECT TOP 1 "UomEntry" AS "UomEntry", "UomCode" AS "UomCode"
           FROM "OUOM"
          WHERE UPPER(TRIM("UomCode")) = UPPER(?)
             OR UPPER(TRIM(IFNULL("UomName", ''))) = UPPER(?)`,
        [preferred, preferred],
      )) as Array<Record<string, unknown>>;
      const fromOuom = toResolved(ouomRows[0]);
      if (fromOuom?.uomEntry != null) {
        return fromOuom;
      }
      // Keep code even when entry missing so caller can still post UoMCode.
      if (fromOuom?.uomCode) {
        return fromOuom;
      }
    }

    // 3) Item sales default when preferred UoM cannot be mapped on seller.
    if (itemCode) {
      return resolveItemSalesUom(db, itemCode);
    }

    return preferred ? { uomCode: preferred, uomEntry: null } : null;
  } catch (err) {
    logger.warn({
      db,
      err,
      itemCode: itemCode || null,
      msg: "Failed to resolve UoM on tenant",
      uomCode: preferred || null,
    });
    return preferred ? { uomCode: preferred, uomEntry: null } : null;
  }
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
