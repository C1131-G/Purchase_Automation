// Sales dashboard: Sales-specific KPIs.

import { and, count, gte, lte, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { salesOrders } from "@/db/schema/sales-orders";
import { arInvoices } from "@/db/schema/ar-invoices";
import { getDateRange } from "./dashboard.period";
import { getCachedData } from "@/core/utils/cache";
import { DASHBOARD_CACHE_TTL } from "./dashboard.constants";

export const getSalesDashboard = (period: "week" | "month" | "year" | "all" = "month") => {
  const cacheKey = `dash:sales:${period}`;
  return getCachedData(
    cacheKey,
    async () => {
      const db = getDb();
      const range = period === "all" ? null : getDateRange(period);
      const where = range
        ? and(gte(salesOrders.docDate, range.startDate), lte(salesOrders.docDate, range.endDate))
        : undefined;
      const arWhere = range
        ? and(gte(arInvoices.docDate, range.startDate), lte(arInvoices.docDate, range.endDate))
        : undefined;

      const [so] = await db
        .select({ total: count(), value: sql`COALESCE(SUM(${salesOrders.docTotal}), 0)` })
        .from(salesOrders)
        .where(where);
      const [ar] = await db
        .select({ total: count(), value: sql`COALESCE(SUM(${arInvoices.docTotal}), 0)` })
        .from(arInvoices)
        .where(arWhere);

      return {
        salesOrders: { total: Number(so.total), value: Number(so.value) },
        arInvoices: { total: Number(ar.total), value: Number(ar.value) },
      };
    },
    DASHBOARD_CACHE_TTL,
  );
};
