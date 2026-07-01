// Inventory dashboard data: Additional inventory data queries.

import { count } from "drizzle-orm";
import { getDb } from "@/db/client";
import { items } from "@/db/schema/items";
import { getCachedData } from "@/core/utils/cache";
import { DASHBOARD_CACHE_TTL } from "./dashboard.constants";

export const getInventoryDashboardData = () => {
  return getCachedData(
    "dash:inventory-data",
    async () => {
      const db = getDb();
      const [row] = await db.select({ count: count() }).from(items);
      return { totalItems: Number(row.count) };
    },
    DASHBOARD_CACHE_TTL,
  );
};
