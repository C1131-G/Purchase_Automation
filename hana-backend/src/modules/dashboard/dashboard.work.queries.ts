// Dashboard work section: independent currency, document KPI, and A/R draft queries.

import { getCachedData } from "@/core/utils/cache";
import { PurchaseOrderSchema } from "@/db/schemas/purchase-order.schema";
import { PurchaseQuotationSchema } from "@/db/schemas/purchase-quotation.schema";
import { SalesQuotationSchema } from "@/db/schemas/sales-quotation.schema";
import { getTenantRepository } from "@/db/tenant-query";
import {
  loadArApprovalPending,
  type OverviewArApprovalItem,
} from "@/modules/dashboard/dashboard.ar-approval.queries";
import { getDisplayCurrency } from "@/services/currency-format";

const OPEN_DOC_STATUS_SEARCH = "DocStatus=Open";
const OVERVIEW_KPI_HREFS = {
  purchaseQuotation: `/purchase/quotations?${OPEN_DOC_STATUS_SEARCH}`,
  purchaseOrder: `/purchase/orders?${OPEN_DOC_STATUS_SEARCH}`,
  salesQuotation: `/sales/quotations?${OPEN_DOC_STATUS_SEARCH}`,
} as const;

export type OverviewKpiMetric = {
  count: number;
  openValue: number;
  href: string;
};

export type OverviewWork = {
  currency: string;
  asOf: string;
  kpis: {
    openPq: OverviewKpiMetric;
    openSq: OverviewKpiMetric;
    openPo: OverviewKpiMetric;
    arApprovalPending: { count: number; openValue: number };
  };
  arApprovalPending: OverviewArApprovalItem[];
};

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
    .select("COUNT(*)", "openCount")
    .addSelect(`SUM(${alias}.docTotal)`, "openValue")
    .where(`${alias}.docStatus = :status`, { status: "O" })
    .getRawOne();

  return {
    count: toCount(stats?.openCount),
    openValue: toMoney(stats?.openValue),
  };
}

export const getOverviewWork = async (dbName: string): Promise<OverviewWork> =>
  getCachedData(
    `dashboard:overview:${dbName}:work`,
    async () => {
      const [currency, openPq, openSq, openPo, arApproval] = await Promise.all([
        getDisplayCurrency(dbName),
        aggregateOpenDocs(dbName, PurchaseQuotationSchema, "pq"),
        aggregateOpenDocs(dbName, SalesQuotationSchema, "sq"),
        aggregateOpenDocs(dbName, PurchaseOrderSchema, "po"),
        loadArApprovalPending(dbName),
      ]);

      return {
        currency,
        asOf: new Date().toISOString(),
        kpis: {
          openPq: { ...openPq, href: OVERVIEW_KPI_HREFS.purchaseQuotation },
          openSq: { ...openSq, href: OVERVIEW_KPI_HREFS.salesQuotation },
          openPo: { ...openPo, href: OVERVIEW_KPI_HREFS.purchaseOrder },
          arApprovalPending: {
            count: arApproval.count,
            openValue: arApproval.openValue,
          },
        },
        arApprovalPending: arApproval.items,
      } satisfies OverviewWork;
    },
    60_000,
  );
