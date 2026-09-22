/**
 * Store-location numbering (same rule as the POS):
 * warehouse → POS StoreWarehouses → Stores.Location → NNM1.Remark.
 */
import { logger } from "@/core/logger/pino-logger";
import { executeTenantQuery } from "@/db/tenant-query";

type Row = Record<string, unknown>;

/** POS store location (Stores.Location) that owns this warehouse. */
export const getWarehouseStoreLocation = async (
  dbName: string,
  warehouseCode: string,
): Promise<string | null> => {
  try {
    const rows = (await executeTenantQuery(
      dbName,
      `SELECT TOP 1 s."Location"
         FROM "StoreWarehouses" sw
         JOIN "Stores" s ON s."StoreId" = sw."StoreId"
        WHERE sw."WarehouseCode" = ?`,
      [warehouseCode],
    )) as Row[];
    const location = String(rows[0]?.Location ?? "").trim();
    return location || null;
  } catch (err) {
    // Company DBs without the POS store tables (e.g. Ajax) have no store location.
    logger.warn({ db: dbName, err, msg: "Failed to resolve POS store location", warehouseCode });
    return null;
  }
};

/** NNM1 series for this document type whose Remarks equals the store location. */
export const resolveLocationSeries = async (
  dbName: string,
  objectCode: string,
  location: string,
): Promise<number | null> => {
  const rows = (await executeTenantQuery(
    dbName,
    `SELECT "Series", "SeriesName"
       FROM NNM1
      WHERE "ObjectCode" = ?
        AND LOWER(TRIM("Remark")) = ?`,
    [objectCode, location.trim().toLowerCase()],
  )) as Row[];
  const series = Math.trunc(Number(rows[0]?.Series));
  return Number.isFinite(series) && series > 0 ? series : null;
};
