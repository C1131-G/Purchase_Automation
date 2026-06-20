// Dashboard Service: Aggregates KPIs, charts, process funnel steps, exceptions, and partner Pareto tables.

import { logger } from "@/core/logger/pino-logger";
import { getCachedData } from "@/core/utils/cache";
import { getTenantRepository } from "@/dal/tenant-dal.helper";
import { ARInvoiceSchema } from "@/db/schemas/ar-invoice.schema";
import { PurchaseOrderSchema } from "@/db/schemas/purchase-order.schema";
import { SalesOrderSchema } from "@/db/schemas/sales-order.schema";

import { loadAreaDataset } from "./dashboard/dashboard.data";

import { buildPurchaseMain } from "./dashboard/purchase-dashboard";
import { buildSalesMain } from "./dashboard/sales-dashboard";
import { loadInventoryDataset } from "./dashboard/inventory-dashboard-data";
import { buildInventoryMain } from "./dashboard/inventory-dashboard";
import type {
  DashboardPeriod,
  DashboardMetric,
  DashboardModuleCard,
  DashboardTrend,
  DashboardFunnelStep,
  DashboardPartnerGroup,
  DashboardExceptionGroup,
} from "./dashboard/dashboard.types";

// Helper: Generates HANA-specific SQL fragments for rolling date windows (backward compatibility).
const getDateFilter = (range?: string) => {
  switch (range?.toLowerCase()) {
    case "weekly": {
      return "ADD_DAYS(CURRENT_DATE, -7)";
    }
    case "monthly": {
      return "ADD_MONTHS(CURRENT_DATE, -1)";
    }
    default: {
      return "ADD_YEARS(CURRENT_DATE, -1)";
    }
  }
};

// Original purchase summary (backward compatibility)
export const getPurchaseSummary = async (dbName: string, range: string = "yearly") => {
  const cacheKey = `dash:purchase:${dbName}:${range}`;

  return getCachedData(cacheKey, async () => {
    try {
      const repo = await getTenantRepository(dbName, PurchaseOrderSchema);
      const dateLimit = getDateFilter(range);

      const stats = await repo
        .createQueryBuilder("po")
        .select("COUNT(po.docEntry)", "totalOrders")
        .addSelect("SUM(CASE WHEN po.docStatus = 'O' THEN 1 ELSE 0 END)", "openOrders")
        .addSelect("SUM(po.docTotal)", "totalSpend")
        .addSelect(
          "SUM(CASE WHEN po.docStatus = 'O' THEN po.docTotal ELSE 0 END)",
          "outstandingSpend",
        )
        .where(`po.docDate >= ${dateLimit}`)
        .getRawOne();

      const topVendors = await repo
        .createQueryBuilder("po")
        .select("po.cardCode", "code")
        .addSelect("po.cardName", "name")
        .addSelect("SUM(po.docTotal)", "spend")
        .where(`po.docDate >= ${dateLimit}`)
        .groupBy("po.cardCode")
        .addGroupBy("po.cardName")
        .orderBy("SUM(po.docTotal)", "DESC")
        .limit(5)
        .getRawMany();

      return {
        stats: {
          openOrders: parseInt(stats?.openOrders || "0", 10),
          outstandingSpend: parseFloat(stats?.outstandingSpend || "0"),
          totalOrders: parseInt(stats?.totalOrders || "0", 10),
          totalSpend: parseFloat(stats?.totalSpend || "0"),
        },
        topVendors: (topVendors as Record<string, unknown>[]).map((data) => ({
          code: data.code as string,
          name: data.name as string,
          spend: Number.parseFloat(data.spend as string),
        })),
      };
    } catch (err: unknown) {
      const caughtError = err instanceof Error ? err : new Error(String(err));
      logger.error({
        db: dbName,
        error: caughtError.message,
        msg: "Failed to fetch purchase metrics",
      });
      throw caughtError;
    }
  });
};

// Original sales summary (backward compatibility)
export const getSalesSummary = async (dbName: string, range: string = "yearly") => {
  const cacheKey = `dash:sales:${dbName}:${range}`;

  return getCachedData(cacheKey, async () => {
    try {
      const soRepo = await getTenantRepository(dbName, SalesOrderSchema);
      const invRepo = await getTenantRepository(dbName, ARInvoiceSchema);
      const dateLimit = getDateFilter(range);

      const salesStats = await soRepo
        .createQueryBuilder("so")
        .select("COUNT(so.docEntry)", "totalOrders")
        .addSelect("SUM(so.docTotal)", "totalRevenue")
        .addSelect("SUM(CASE WHEN so.docStatus = 'O' THEN 1 ELSE 0 END)", "activeOrders")
        .where(`so.docDate >= ${dateLimit}`)
        .getRawOne();

      const financialStats = await invRepo
        .createQueryBuilder("inv")
        .select("SUM(inv.docTotal)", "totalInvoiced")
        .addSelect(
          "SUM(CASE WHEN inv.docStatus = 'O' THEN (inv.docTotal - inv.paidToDate) ELSE 0 END)",
          "outstandingBalance",
        )
        .where(`inv.docDate >= ${dateLimit}`)
        .getRawOne();

      let groupBy = "TO_VARCHAR(so.docDate, 'YYYY-MM')";
      if (range === "weekly") {
        groupBy = "TO_VARCHAR(so.docDate, 'YYYY-MM-DD')";
      }

      const trends = await soRepo
        .createQueryBuilder("so")
        .select(groupBy, "timeLabel")
        .addSelect("SUM(so.docTotal)", "revenue")
        .where(`so.docDate >= ${dateLimit}`)
        .groupBy(groupBy)
        .orderBy(groupBy, "ASC")
        .getRawMany();

      return {
        revenueTrends: (trends as Record<string, unknown>[]).map((data) => ({
          label: data.timeLabel as string,
          revenue: parseFloat(data.revenue as string),
        })),
        stats: {
          activeOrders: parseInt(salesStats?.activeOrders || "0", 10),
          outstandingBalance: parseFloat(financialStats?.outstandingBalance || "0"),
          totalOrders: parseInt(salesStats?.totalOrders || "0", 10),
          totalRevenue: parseFloat(salesStats?.totalRevenue || "0"),
        },
      };
    } catch (err: unknown) {
      const caughtError = err instanceof Error ? err : new Error(String(err));
      logger.error({
        db: dbName,
        error: caughtError.message,
        msg: "Failed to fetch sales metrics",
      });
      throw caughtError;
    }
  });
};

type DashboardSectionResponse<T> = {
  data: T;
  currency: string;
};

// Purchase KPI summary
export const getPurchaseKpiSummary = async (
  period: DashboardPeriod,
  dbName: string,
): Promise<DashboardSectionResponse<DashboardMetric[]>> => {
  const dataset = await loadAreaDataset("purchase", period, dbName);
  const output = buildPurchaseMain(dataset);
  return { data: output.summary, currency: dataset.currency };
};

// Sales KPI summary
export const getSalesKpiSummary = async (
  period: DashboardPeriod,
  dbName: string,
): Promise<DashboardSectionResponse<DashboardMetric[]>> => {
  const dataset = await loadAreaDataset("sales", period, dbName);
  const output = buildSalesMain(dataset);
  return { data: output.summary, currency: dataset.currency };
};

// Purchase module cards
export const getPurchaseModuleCards = async (
  period: DashboardPeriod,
  dbName: string,
): Promise<DashboardSectionResponse<DashboardModuleCard[]>> => {
  const dataset = await loadAreaDataset("purchase", period, dbName);
  const output = buildPurchaseMain(dataset);
  return { data: output.moduleCards, currency: dataset.currency };
};

// Sales module cards
export const getSalesModuleCards = async (
  period: DashboardPeriod,
  dbName: string,
): Promise<DashboardSectionResponse<DashboardModuleCard[]>> => {
  const dataset = await loadAreaDataset("sales", period, dbName);
  const output = buildSalesMain(dataset);
  return { data: output.moduleCards, currency: dataset.currency };
};

// Purchase Trend
export const getPurchaseTrend = async (
  period: DashboardPeriod,
  dbName: string,
): Promise<DashboardSectionResponse<DashboardTrend>> => {
  const dataset = await loadAreaDataset("purchase", period, dbName);
  const output = buildPurchaseMain(dataset);
  return { data: output.trend, currency: dataset.currency };
};

// Sales Trend
export const getSalesTrend = async (
  period: DashboardPeriod,
  dbName: string,
): Promise<DashboardSectionResponse<DashboardTrend>> => {
  const dataset = await loadAreaDataset("sales", period, dbName);
  const output = buildSalesMain(dataset);
  return { data: output.trend, currency: dataset.currency };
};

// Purchase Funnel
export const getPurchaseFunnel = async (
  period: DashboardPeriod,
  dbName: string,
): Promise<DashboardSectionResponse<DashboardFunnelStep[]>> => {
  const dataset = await loadAreaDataset("purchase", period, dbName);
  const output = buildPurchaseMain(dataset);
  return { data: output.funnel, currency: dataset.currency };
};

// Sales Funnel
export const getSalesFunnel = async (
  period: DashboardPeriod,
  dbName: string,
): Promise<DashboardSectionResponse<DashboardFunnelStep[]>> => {
  const dataset = await loadAreaDataset("sales", period, dbName);
  const output = buildSalesMain(dataset);
  return { data: output.funnel, currency: dataset.currency };
};

// Purchase Top Partners
export const getPurchaseTopPartners = async (
  period: DashboardPeriod,
  dbName: string,
): Promise<DashboardSectionResponse<DashboardPartnerGroup[]>> => {
  const dataset = await loadAreaDataset("purchase", period, dbName);
  const output = buildPurchaseMain(dataset);
  return { data: output.topPartners, currency: dataset.currency };
};

// Sales Top Partners
export const getSalesTopPartners = async (
  period: DashboardPeriod,
  dbName: string,
): Promise<DashboardSectionResponse<DashboardPartnerGroup[]>> => {
  const dataset = await loadAreaDataset("sales", period, dbName);
  const output = buildSalesMain(dataset);
  return { data: output.topPartners, currency: dataset.currency };
};

// Purchase Exceptions
export const getPurchaseExceptions = async (
  period: DashboardPeriod,
  dbName: string,
): Promise<DashboardSectionResponse<DashboardExceptionGroup[]>> => {
  const dataset = await loadAreaDataset("purchase", period, dbName);
  const output = buildPurchaseMain(dataset);
  return { data: output.exceptions, currency: dataset.currency };
};

// Sales Exceptions
export const getSalesExceptions = async (
  period: DashboardPeriod,
  dbName: string,
): Promise<DashboardSectionResponse<DashboardExceptionGroup[]>> => {
  const dataset = await loadAreaDataset("sales", period, dbName);
  const output = buildSalesMain(dataset);
  return { data: output.exceptions, currency: dataset.currency };
};

// ---------------------------------------------------------------------------
// Inventory dashboard — all sections read from one shared cached dataset
// ---------------------------------------------------------------------------

// Inventory KPI summary
export const getInventoryKpiSummary = async (
  period: DashboardPeriod,
  dbName: string,
): Promise<DashboardSectionResponse<DashboardMetric[]>> => {
  const dataset = await loadInventoryDataset(period, dbName);
  const output = buildInventoryMain(dataset);
  return { data: output.summary, currency: dataset.currency };
};

// Inventory module cards
export const getInventoryModuleCards = async (
  period: DashboardPeriod,
  dbName: string,
): Promise<DashboardSectionResponse<DashboardModuleCard[]>> => {
  const dataset = await loadInventoryDataset(period, dbName);
  const output = buildInventoryMain(dataset);
  return { data: output.moduleCards, currency: dataset.currency };
};

// Inventory trend
export const getInventoryTrend = async (
  period: DashboardPeriod,
  dbName: string,
): Promise<DashboardSectionResponse<DashboardTrend>> => {
  const dataset = await loadInventoryDataset(period, dbName);
  const output = buildInventoryMain(dataset);
  return { data: output.trend, currency: dataset.currency };
};

// Inventory funnel
export const getInventoryFunnel = async (
  period: DashboardPeriod,
  dbName: string,
): Promise<DashboardSectionResponse<DashboardFunnelStep[]>> => {
  const dataset = await loadInventoryDataset(period, dbName);
  const output = buildInventoryMain(dataset);
  return { data: output.funnel, currency: dataset.currency };
};

// Inventory top partners (warehouse groups, pre-computed in dataset)
export const getInventoryTopPartners = async (
  period: DashboardPeriod,
  dbName: string,
): Promise<DashboardSectionResponse<DashboardPartnerGroup[]>> => {
  const dataset = await loadInventoryDataset(period, dbName);
  const output = buildInventoryMain(dataset);
  return { data: output.topPartners, currency: dataset.currency };
};

// Inventory exceptions
export const getInventoryExceptions = async (
  period: DashboardPeriod,
  dbName: string,
): Promise<DashboardSectionResponse<DashboardExceptionGroup[]>> => {
  const dataset = await loadInventoryDataset(period, dbName);
  const output = buildInventoryMain(dataset);
  return { data: output.exceptions, currency: dataset.currency };
};

export const dashboardService = {
  getPurchaseSummary,
  getSalesSummary,
  getPurchaseKpiSummary,
  getSalesKpiSummary,
  getPurchaseModuleCards,
  getSalesModuleCards,
  getPurchaseTrend,
  getSalesTrend,
  getPurchaseFunnel,
  getSalesFunnel,
  getPurchaseTopPartners,
  getSalesTopPartners,
  getPurchaseExceptions,
  getSalesExceptions,
  getInventoryKpiSummary,
  getInventoryModuleCards,
  getInventoryTrend,
  getInventoryFunnel,
  getInventoryTopPartners,
  getInventoryExceptions,
};
