// Dashboard partners: Top vendors and customers by document value.

import { count, desc, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { purchaseOrders } from "@/db/schema/purchase-orders";
import { salesOrders } from "@/db/schema/sales-orders";
import { DASHBOARD_CACHE_TTL } from "./dashboard.constants";
import type { DashboardPartnerSummary } from "./dashboard.types";
import { getCachedData } from "@/core/utils/cache";

export const getTopVendors = async (limit: number = 5): Promise<DashboardPartnerSummary[]> => {
  return getCachedData(
    "dash:top-vendors",
    async () => {
      const db = getDb();
      const rows = await db
        .select({
          code: purchaseOrders.cardCode,
          name: purchaseOrders.cardName,
          docCount: count(),
          totalValue: sql`COALESCE(SUM(${purchaseOrders.docTotal}), 0)`,
        })
        .from(purchaseOrders)
        .groupBy(purchaseOrders.cardCode, purchaseOrders.cardName)
        .orderBy(desc(sql`COALESCE(SUM(${purchaseOrders.docTotal}), 0)`))
        .limit(limit);

      return rows.map((r) => ({
        code: r.code ?? "",
        name: r.name ?? "",
        docCount: Number(r.docCount),
        totalValue: Number(r.totalValue),
      }));
    },
    DASHBOARD_CACHE_TTL,
  );
};

export const getTopCustomers = async (limit: number = 5): Promise<DashboardPartnerSummary[]> => {
  return getCachedData(
    "dash:top-customers",
    async () => {
      const db = getDb();
      const rows = await db
        .select({
          code: salesOrders.cardCode,
          name: salesOrders.cardName,
          docCount: count(),
          totalValue: sql`COALESCE(SUM(${salesOrders.docTotal}), 0)`,
        })
        .from(salesOrders)
        .groupBy(salesOrders.cardCode, salesOrders.cardName)
        .orderBy(desc(sql`COALESCE(SUM(${salesOrders.docTotal}), 0)`))
        .limit(limit);

      return rows.map((r) => ({
        code: r.code ?? "",
        name: r.name ?? "",
        docCount: Number(r.docCount),
        totalValue: Number(r.totalValue),
      }));
    },
    DASHBOARD_CACHE_TTL,
  );
};
