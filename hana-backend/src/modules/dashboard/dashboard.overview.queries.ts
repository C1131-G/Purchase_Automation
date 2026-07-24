// Overview Dashboard: open-document KPIs (no period filter) for the post-login home surface.

import { logger } from "@/core/logger/pino-logger";
import { getCachedData } from "@/core/utils/cache";
import { PurchaseOrderSchema } from "@/db/schemas/purchase-order.schema";
import { PurchaseQuotationSchema } from "@/db/schemas/purchase-quotation.schema";
import { SalesQuotationSchema } from "@/db/schemas/sales-quotation.schema";
import { getTenantRepository } from "@/db/tenant-query";
import { getDisplayCurrency } from "@/services/currency-format";
import { MODULE_HREFS } from "@/services/dashboard/dashboard.constants";

export type OverviewKpiMetric = {
  count: number;
  openValue: number;
  href: string;
};

export type OverviewDashboard = {
  currency: string;
  asOf: string;
  kpis: {
    openPq: OverviewKpiMetric;
    openSq: OverviewKpiMetric;
    openPo: OverviewKpiMetric;
    arApprovalPending: { count: number; openValue: number };
  };
  connectedPartners: [];
  arApprovalPending: [];
  statement: {
    partners: [];
    totals: {
      balance: number;
      aging: { d0_30: number; d31_60: number; d61_90: number; d90_plus: number };
    };
  };
};

const emptyAging = () => ({ d0_30: 0, d31_60: 0, d61_90: 0, d90_plus: 0 });

const toCount = (value: unknown): number => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : 0;
};

const toMoney = (value: unknown): number => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : 0;
};

async function aggregateOpenDocs(
  dbName: string,
  schema: typeof PurchaseQuotationSchema | typeof SalesQuotationSchema | typeof PurchaseOrderSchema,
  alias: string,
): Promise<{ count: number; openValue: number }> {
  const repo = await getTenantRepository(dbName, schema);
  const stats = await repo
    .createQueryBuilder(alias)
    .select(`SUM(CASE WHEN ${alias}.docStatus = 'O' THEN 1 ELSE 0 END)`, "openCount")
    .addSelect(
      `SUM(CASE WHEN ${alias}.docStatus = 'O' THEN ${alias}.docTotal ELSE 0 END)`,
      "openValue",
    )
    .getRawOne();

  return {
    count: toCount(stats?.openCount),
    openValue: toMoney(stats?.openValue),
  };
}

/**
 * Current open PQ / SQ / PO for the session company.
 * AR approval, IC partners, and statement are stubs until P2–P4.
 */
export const getOverviewDashboard = async (dbName: string): Promise<OverviewDashboard> => {
  const cacheKey = `dashboard:overview:${dbName}`;
  const cacheTtlMs = 15_000;

  return getCachedData(
    cacheKey,
    async () => {
      try {
        const currency = await getDisplayCurrency(dbName);
        const [openPq, openSq, openPo] = await Promise.all([
          aggregateOpenDocs(dbName, PurchaseQuotationSchema, "pq"),
          aggregateOpenDocs(dbName, SalesQuotationSchema, "sq"),
          aggregateOpenDocs(dbName, PurchaseOrderSchema, "po"),
        ]);

        return {
          currency,
          asOf: new Date().toISOString(),
          kpis: {
            openPq: {
              count: openPq.count,
              openValue: openPq.openValue,
              href: MODULE_HREFS.purchaseQuotation,
            },
            openSq: {
              count: openSq.count,
              openValue: openSq.openValue,
              href: MODULE_HREFS.salesQuotation,
            },
            openPo: {
              count: openPo.count,
              openValue: openPo.openValue,
              href: MODULE_HREFS.purchaseOrder,
            },
            arApprovalPending: { count: 0, openValue: 0 },
          },
          connectedPartners: [],
          arApprovalPending: [],
          statement: {
            partners: [],
            totals: { balance: 0, aging: emptyAging() },
          },
        } satisfies OverviewDashboard;
      } catch (err: unknown) {
        const caughtError = err instanceof Error ? err : new Error(String(err));
        logger.error({
          db: dbName,
          err: caughtError,
          msg: "Failed to fetch overview dashboard",
        });
        throw caughtError;
      }
    },
    cacheTtlMs,
  );
};
