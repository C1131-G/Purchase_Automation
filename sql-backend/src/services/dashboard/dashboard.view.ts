// Dashboard view: Assembles the full dashboard response.

import { DASHBOARD_CACHE_TTL } from "./dashboard.constants";
import type { DashboardData } from "./dashboard.types";
import { getPurchaseSummary, getSalesSummary, getInventorySummary } from "./dashboard.data";
import { getPurchaseTrend, getSalesTrend } from "./dashboard.trend";
import { getTopVendors, getTopCustomers } from "./dashboard.partners";
import { getCachedData } from "@/core/utils/cache";

export const getDashboard = async (
  period: "week" | "month" | "year" | "all",
): Promise<DashboardData> => {
  const cacheKey = `dash:full:${period}`;

  return getCachedData(
    cacheKey,
    async () => {
      const [
        purchaseSummary,
        salesSummary,
        inventory,
        purchaseTrend,
        salesTrend,
        topVendors,
        topCustomers,
      ] = await Promise.all([
        getPurchaseSummary(period),
        getSalesSummary(period),
        getInventorySummary(),
        getPurchaseTrend("month"),
        getSalesTrend("month"),
        getTopVendors(),
        getTopCustomers(),
      ]);

      return {
        summary: { ...purchaseSummary, ...salesSummary },
        purchaseTrend,
        salesTrend,
        topVendors,
        topCustomers,
        inventory,
      };
    },
    DASHBOARD_CACHE_TTL,
  );
};
