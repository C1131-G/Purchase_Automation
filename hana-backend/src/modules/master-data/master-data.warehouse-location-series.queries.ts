/**
 * Warehouse-location numbering:
 * warehouse → SAP location (OWHS.Location → OLCT.Location) → NNM1.Remark, within the document
 * branch (NNM1.BPLId).
 */
import { logger } from "@/core/logger/pino-logger";
import { executeTenantQuery } from "@/db/tenant-query";

type Row = Record<string, unknown>;

/** SAP location name (OLCT.Location) set on the warehouse master (OWHS.Location). */
export const getWarehouseLocation = async (
  dbName: string,
  warehouseCode: string,
): Promise<string | null> => {
  try {
    const rows = (await executeTenantQuery(
      dbName,
      `SELECT l."Location"
         FROM OWHS w
         JOIN OLCT l ON l."Code" = w."Location"
        WHERE w."WhsCode" = ?`,
      [warehouseCode],
    )) as Row[];
    const location = String(rows[0]?.Location ?? "").trim();
    return location || null;
  } catch (err) {
    logger.warn({ db: dbName, err, msg: "Failed to resolve warehouse location", warehouseCode });
    return null;
  }
};

/** NNM1 series for this document type whose Remarks = warehouse location AND BPLId = branch. */
export const resolveLocationSeries = async (
  dbName: string,
  objectCode: string,
  location: string,
  branchId: number,
): Promise<number | null> => {
  try {
    const rows = (await executeTenantQuery(
      dbName,
      `SELECT "Series", "SeriesName"
         FROM NNM1
        WHERE "ObjectCode" = ?
          AND LOWER(TRIM("Remark")) = ?
          AND "BPLId" = ?`,
      [objectCode, location.trim().toLowerCase(), branchId],
    )) as Row[];
    const series = Math.trunc(Number(rows[0]?.Series));
    return Number.isFinite(series) && series > 0 ? series : null;
  } catch (err) {
    // Older company DBs may not have NNM1.BPLId — no branch-bound series.
    logger.warn({
      branchId,
      db: dbName,
      err,
      location,
      msg: "Failed to resolve location series",
      objectCode,
    });
    return null;
  }
};
