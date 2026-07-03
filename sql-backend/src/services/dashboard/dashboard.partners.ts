// Dashboard partners — matching hana + legacy compat.

import type { DashboardPartnerEntry, DashboardPartnerGroup } from "./dashboard.types";
import { getOpenValue } from "./dashboard.calculations";
import { MODULE_HREFS } from "./dashboard.constants";
import type { ModuleDataset, PartnerAggregate, RawDashboardDocument } from "./dashboard.types";
import { getCachedData } from "@/core/utils/cache";
import { DASHBOARD_CACHE_TTL } from "./dashboard.constants";
import { getDb } from "@/db/client";
import { purchaseOrders } from "@/db/schema/purchase-orders";
import { salesOrders } from "@/db/schema/sales-orders";
import { count, desc, sql } from "drizzle-orm";

const aggregatePartners = (docs: RawDashboardDocument[]): DashboardPartnerEntry[] => {
  const entries = new Map<string, PartnerAggregate>();
  for (const doc of docs) {
    const key = doc.cardCode || doc.cardName || `${doc.docNum}`;
    const existing = entries.get(key);
    if (existing) {
      existing.totalValue = Number((existing.totalValue + doc.docTotal).toFixed(2));
      existing.documentCount += 1;
      existing.openValue = Number((existing.openValue + getOpenValue(doc)).toFixed(2));
      continue;
    }
    entries.set(key, {
      code: doc.cardCode || key,
      name: doc.cardName || doc.cardCode || "Unknown partner",
      totalValue: Number(doc.docTotal.toFixed(2)),
      documentCount: 1,
      openValue: Number(getOpenValue(doc).toFixed(2)),
    });
  }
  return Array.from(entries.values())
    .sort((left, right) => right.totalValue - left.totalValue)
    .slice(0, 5)
    .map((entry) => ({
      code: entry.code,
      name: entry.name,
      totalValue: entry.totalValue,
      documentCount: entry.documentCount,
      openValue: entry.openValue,
    }));
};

export const buildPartnerGroup = (module: ModuleDataset, title: string): DashboardPartnerGroup => ({
  key: module.module,
  title,
  module: module.module,
  href: MODULE_HREFS[module.module],
  entries: aggregatePartners(module.current),
});

// Legacy top vendors/customers
export const getTopVendors = async (limit = 5) => {
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
      return rows.map((r: any) => ({
        code: r.code ?? "",
        name: r.name ?? "",
        docCount: Number(r.docCount),
        totalValue: Number(r.totalValue),
      }));
    },
    DASHBOARD_CACHE_TTL,
  );
};
export const getTopCustomers = async (limit = 5) => {
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
      return rows.map((r: any) => ({
        code: r.code ?? "",
        name: r.name ?? "",
        docCount: Number(r.docCount),
        totalValue: Number(r.totalValue),
      }));
    },
    DASHBOARD_CACHE_TTL,
  );
};
