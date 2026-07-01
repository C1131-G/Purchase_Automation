// Inventory dashboard: Inventory-specific KPIs.

import { count, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { items } from "@/db/schema/items";
import { itemWarehouseStock } from "@/db/schema/item-warehouse-stock";
import { getCachedData } from "@/core/utils/cache";
import { DASHBOARD_CACHE_TTL } from "./dashboard.constants";
import type { InventorySummary } from "./dashboard.types";

export const getInventoryDashboard = async (): Promise<InventorySummary> => {
  return getCachedData(
    "dash:inventory",
    async () => {
      const db = getDb();

      const [itemCount] = await db.select({ total: count() }).from(items);
      const [stock] = await db
        .select({ total: sql`COALESCE(SUM(${itemWarehouseStock.onHand}), 0)` })
        .from(itemWarehouseStock);
      const [lowStock] = await db
        .select({ total: count() })
        .from(itemWarehouseStock)
        .where(sql`${itemWarehouseStock.onHand} <= 10`);

      return {
        totalItems: Number(itemCount.total),
        totalStock: Number(stock.total),
        lowStockItems: Number(lowStock.total),
      };
    },
    DASHBOARD_CACHE_TTL,
  );
};
