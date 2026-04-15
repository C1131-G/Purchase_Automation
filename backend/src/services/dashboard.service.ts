// Dashboard Service: Aggregation logic for High-Level KPIs, utilizing HANA SQL for performant analytics and multi-layer caching.

// Core & Utils
import { logger } from "@/core/logger/pino-logger";
import { getCachedData } from "@/core/utils/cache";
import { getTenantRepository } from "@/dal/tenant-dal.helper";
import { ARInvoiceSchema } from "@/db/schemas/ar-invoice.schema";
import { PurchaseOrderSchema } from "@/db/schemas/purchase-order.schema";
import { SalesOrderSchema } from "@/db/schemas/sales-order.schema";

// Helper: Generates HANA-specific SQL fragments for rolling date windows.
const getDateFilter = (range?: string) => {
  switch (range?.toLowerCase()) {
    case "weekly":
      // HANA Syntax for subtracting 7 days.
      return "ADD_DAYS(CURRENT_DATE, -7)";
    case "monthly":
      return "ADD_MONTHS(CURRENT_DATE, -1)";
    default:
      // Fallback to Yearly view for broader context.
      return "ADD_YEARS(CURRENT_DATE, -1)";
  }
};

// Computes Purchase Order KPIs and Top Vendor rankings for Supply Chain visibility.
export const getPurchaseSummary = async (dbName: string, range: string = "yearly") => {
  // Tenant-specific caching to prevent heavy aggregation queries on every dashboard load.
  const cacheKey = `dash:purchase:${dbName}:${range}`;

  return getCachedData(cacheKey, async () => {
    try {
      const repo = await getTenantRepository(dbName, PurchaseOrderSchema);
      const dateLimit = getDateFilter(range);

      // 1. Aggregated Statistics: Uses getRawOne because queries return scalars (SUM/COUNT), not entities.
      const stats = await repo
        .createQueryBuilder("po")
        .select("COUNT(po.docEntry)", "totalOrders")
        // Industry Logic: Open orders represent pending commitments.
        .addSelect("SUM(CASE WHEN po.docStatus = 'O' THEN 1 ELSE 0 END)", "openOrders")
        .addSelect("SUM(po.docTotal)", "totalSpend")
        .addSelect(
          "SUM(CASE WHEN po.docStatus = 'O' THEN po.docTotal ELSE 0 END)",
          "outstandingSpend",
        )
        .where(`po.docDate >= ${dateLimit}`)
        .getRawOne();

      // 2. Pareto Analysis: Identifies top 5 vendors by spend.
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
          totalOrders: parseInt(stats?.totalOrders || "0", 10),
          openOrders: parseInt(stats?.openOrders || "0", 10),
          totalSpend: parseFloat(stats?.totalSpend || "0"),
          outstandingSpend: parseFloat(stats?.outstandingSpend || "0"),
        },
        topVendors: (topVendors as Record<string, unknown>[]).map((data) => ({
          code: data.code as string,
          name: data.name as string,
          spend: parseFloat(data.spend as string),
        })),
      };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.error({
        msg: "Failed to fetch purchase metrics",
        error: error.message,
        db: dbName,
      });
      throw error;
    }
  });
};

// Computes Sales Performance and Financial Health metrics (Receivables).
export const getSalesSummary = async (dbName: string, range: string = "yearly") => {
  const cacheKey = `dash:sales:${dbName}:${range}`;

  return getCachedData(cacheKey, async () => {
    try {
      const soRepo = await getTenantRepository(dbName, SalesOrderSchema);
      const invRepo = await getTenantRepository(dbName, ARInvoiceSchema);
      const dateLimit = getDateFilter(range);

      // 1. Sales Order Volume & Gross Revenue.
      const salesStats = await soRepo
        .createQueryBuilder("so")
        .select("COUNT(so.docEntry)", "totalOrders")
        .addSelect("SUM(so.docTotal)", "totalRevenue")
        .addSelect("SUM(CASE WHEN so.docStatus = 'O' THEN 1 ELSE 0 END)", "activeOrders")
        .where(`so.docDate >= ${dateLimit}`)
        .getRawOne();

      // 2. Financials: Calculates current outstanding debt by subtracting payments from gross invoice totals.
      const financialStats = await invRepo
        .createQueryBuilder("inv")
        .select("SUM(inv.docTotal)", "totalInvoiced")
        .addSelect(
          "SUM(CASE WHEN inv.docStatus = 'O' THEN (inv.docTotal - inv.paidSum) ELSE 0 END)",
          "outstandingBalance",
        )
        .where(`inv.docDate >= ${dateLimit}`)
        .getRawOne();

      // 3. Time-Series Trend: For visual charts on the frontend.
      // Dynamic grouping: Days for weekly views, Months for yearly views.
      let groupBy = "TO_VARCHAR(so.docDate, 'YYYY-MM')"; // Monthly (e.g., 2023-01)
      if (range === "weekly") {
        groupBy = "TO_VARCHAR(so.docDate, 'YYYY-MM-DD')"; // Daily (e.g., 2023-01-01)
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
        stats: {
          totalOrders: parseInt(salesStats?.totalOrders || "0", 10),
          totalRevenue: parseFloat(salesStats?.totalRevenue || "0"),
          activeOrders: parseInt(salesStats?.activeOrders || "0", 10),
          outstandingBalance: parseFloat(financialStats?.outstandingBalance || "0"),
        },
        revenueTrends: (trends as Record<string, unknown>[]).map((data) => ({
          label: data.timeLabel as string,
          revenue: parseFloat(data.revenue as string),
        })),
      };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.error({
        msg: "Failed to fetch sales metrics",
        error: error.message,
        db: dbName,
      });
      throw error;
    }
  });
};

export const dashboardService = {
  getPurchaseSummary,
  getSalesSummary,
};
