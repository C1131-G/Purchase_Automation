import { logger } from "@/core/logger/pino-logger";
import { getCachedData } from "@/core/utils/cache";
import { executeTenantQuery } from "@/db/tenant-query";
export const getInventoryAdjustmentReasons = async (
  dbName: string,
  type: "receipt" | "issue" = "receipt",
) => {
  const tableId = type === "issue" ? "IGE1" : "IGN1";
  const cacheKey = `master:${dbName}:InventoryAdjustmentReasons:${type}`;

  return getCachedData(
    cacheKey,
    async () => {
      try {
        const rows = (await executeTenantQuery(
          dbName,
          `SELECT "FldValue", "Descr" FROM "UFD1" WHERE "TableID"='${tableId}' AND "FieldID" IN (SELECT "FieldID" FROM "CUFD" WHERE "TableID"='${tableId}' AND "AliasID"='INVADJMTRES')`,
        )) as Array<{
          FldValue: string;
          Descr: string;
        }>;

        return rows.map((row) => ({
          code: row.FldValue,
          name: row.Descr,
        }));
      } catch (err) {
        logger.error({ db: dbName, err }, "Failed to fetch inventory adjustment reasons");
        return [];
      }
    },
    1000 * 60 * 60, // 1 hour cache
  );
};
