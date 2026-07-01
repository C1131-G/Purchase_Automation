// Purchase dashboard: Purchase-specific KPIs.

import { and, count, gte, lte, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { purchaseOrders } from "@/db/schema/purchase-orders";
import { grpo } from "@/db/schema/grpo";
import { getDateRange } from "./dashboard.period";
import { getCachedData } from "@/core/utils/cache";
import { DASHBOARD_CACHE_TTL } from "./dashboard.constants";

export const getPurchaseDashboard = (period: "week" | "month" | "year" | "all" = "month") => {
  const cacheKey = `dash:purchase:${period}`;
  return getCachedData(
    cacheKey,
    async () => {
      const db = getDb();
      const range = period === "all" ? null : getDateRange(period);
      const where = range
        ? and(
            gte(purchaseOrders.docDate, range.startDate),
            lte(purchaseOrders.docDate, range.endDate),
          )
        : undefined;

      const [poData] = await db
        .select({ total: count(), value: sql`COALESCE(SUM(${purchaseOrders.docTotal}), 0)` })
        .from(purchaseOrders)
        .where(where);
      const [grpoData] = await db
        .select({ total: count(), value: sql`COALESCE(SUM(${grpo.docTotal}), 0)` })
        .from(grpo)
        .where(where);

      return {
        purchaseOrders: { total: Number(poData.total), value: Number(poData.value) },
        grpo: { total: Number(grpoData.total), value: Number(grpoData.value) },
      };
    },
    DASHBOARD_CACHE_TTL,
  );
};
