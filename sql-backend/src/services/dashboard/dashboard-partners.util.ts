// Dashboard partners — matching hana + Number(legacy) compat.

import { count, desc, sql } from "drizzle-orm";

import { getCachedData } from "@/core/utils/cache";
import { getDb } from "@/db/client";
import { purchaseOrders } from "@/db/schema/purchase-orders";
import { salesOrders } from "@/db/schema/sales-orders";

import { getOpenValue } from "./dashboard-calculations.util";
import { MODULE_HREFS, DASHBOARD_CACHE_TTL } from "./dashboard-constants.util";
import type { DashboardPartnerEntry, DashboardPartnerGroup } from "./dashboard.types";
import type { ModuleDataset, PartnerAggregate, RawDashboardDocument } from "./dashboard.types";

const aggregatePartners = (docs: RawDashboardDocument[]): DashboardPartnerEntry[] => {
  const entries = new Map<string, PartnerAggregate>();
  for (const doc of docs) {
    const key = doc.cardCode || doc.cardName || `${doc.docNum}`;
    const existing = entries.get(key);
    if (existing) {
      existing.totalValue = Number((existing.totalValue + Number(doc.docTotal)).toFixed(2));
      existing.documentCount += 1;
      existing.openValue = Number((existing.openValue + getOpenValue(doc)).toFixed(2));
      continue;
    }
    entries.set(key, {
      code: doc.cardCode || key,
      documentCount: 1,
      name: doc.cardName || doc.cardCode || "Unknown partner",
      openValue: Number(getOpenValue(doc).toFixed(2)),
      totalValue: Number(doc.docTotal.toFixed(2)),
    });
  }
  return [...entries.values()]
    .toSorted((left, right) => right.totalValue - left.totalValue)
    .slice(0, 5)
    .map((entry) => ({
      code: entry.code,
      documentCount: entry.documentCount,
      name: entry.name,
      openValue: entry.openValue,
      totalValue: entry.totalValue,
    }));
};

export const buildPartnerGroup = (module: ModuleDataset, title: string): DashboardPartnerGroup => ({
  entries: aggregatePartners(module.current),
  href: MODULE_HREFS[module.module],
  key: module.module,
  module: module.module,
  title,
});

// Legacy top vendors/customers
export const getTopVendors = (limit = 5) =>
  getCachedData(
    "dash:top-vendors",
    async () => {
      const db = getDb();
      const rows = await db
        .select({
          code: purchaseOrders.cardCode,
          docCount: count(),
          name: purchaseOrders.cardName,
          totalValue: sql`COALESCE(SUM(${purchaseOrders.docTotal}), 0)`,
        })
        .from(purchaseOrders)
        .groupBy(purchaseOrders.cardCode, purchaseOrders.cardName)
        .orderBy(desc(sql`COALESCE(SUM(${purchaseOrders.docTotal}), 0)`))
        .limit(limit);
      return rows.map((r: Record<string, unknown>) => ({
        code: r.code ?? "",
        docCount: Number(r.docCount),
        name: r.name ?? "",
        totalValue: Number(r.totalValue),
      }));
    },
    DASHBOARD_CACHE_TTL,
  );
export const getTopCustomers = (limit = 5) =>
  getCachedData(
    "dash:top-customers",
    async () => {
      const db = getDb();
      const rows = await db
        .select({
          code: salesOrders.cardCode,
          docCount: count(),
          name: salesOrders.cardName,
          totalValue: sql`COALESCE(SUM(${salesOrders.docTotal}), 0)`,
        })
        .from(salesOrders)
        .groupBy(salesOrders.cardCode, salesOrders.cardName)
        .orderBy(desc(sql`COALESCE(SUM(${salesOrders.docTotal}), 0)`))
        .limit(limit);
      return rows.map((r: Record<string, unknown>) => ({
        code: r.code ?? "",
        docCount: Number(r.docCount),
        name: r.name ?? "",
        totalValue: Number(r.totalValue),
      }));
    },
    DASHBOARD_CACHE_TTL,
  );
