import { timedDashboardSection } from "@/core/observability/dashboard";
import { loadAreaDataset } from "@/services/dashboard/dashboard-data.util";
import { getDashboard as getLegacyDashboard } from "@/services/dashboard/dashboard-view.util";
import {
  buildInventoryMain,
  getInventoryDashboard,
} from "@/services/dashboard/dashboard.inventory";
import { loadInventoryDataset } from "@/services/dashboard/dashboard.inventory-data";
import { buildPurchaseMain } from "@/services/dashboard/dashboard.purchase";
import { buildSalesMain } from "@/services/dashboard/dashboard.sales";
import type { DashboardPeriod } from "@/services/dashboard/dashboard.types";

const toPeriod = (period: string): DashboardPeriod =>
  period === "weekly" || period === "week"
    ? "week"
    : period === "yearly" || period === "year"
      ? "year"
      : period === "all"
        ? "all"
        : "month";

export const getPurchaseKpiSummary = async (period: DashboardPeriod) =>
  timedDashboardSection("purchase.kpi", async () => {
    const d = await loadAreaDataset("purchase", period);
    const o = buildPurchaseMain(d);
    return { currency: d.currency, data: o.summary };
  });
export const getPurchaseModuleCards = async (period: DashboardPeriod) =>
  timedDashboardSection("purchase.module_cards", async () => {
    const d = await loadAreaDataset("purchase", period);
    const o = buildPurchaseMain(d);
    return { currency: d.currency, data: o.moduleCards };
  });
export const getPurchaseTrend = async (period: DashboardPeriod) =>
  timedDashboardSection("purchase.trend", async () => {
    const d = await loadAreaDataset("purchase", period);
    const o = buildPurchaseMain(d);
    return { currency: d.currency, data: o.trend };
  });
export const getPurchaseFunnel = async (period: DashboardPeriod) =>
  timedDashboardSection("purchase.funnel", async () => {
    const d = await loadAreaDataset("purchase", period);
    const o = buildPurchaseMain(d);
    return { currency: d.currency, data: o.funnel };
  });
export const getPurchaseTopPartners = async (period: DashboardPeriod) =>
  timedDashboardSection("purchase.top_partners", async () => {
    const d = await loadAreaDataset("purchase", period);
    const o = buildPurchaseMain(d);
    return { currency: d.currency, data: o.topPartners };
  });
export const getPurchaseExceptions = async (period: DashboardPeriod) =>
  timedDashboardSection("purchase.exceptions", async () => {
    const d = await loadAreaDataset("purchase", period);
    const o = buildPurchaseMain(d);
    return { currency: d.currency, data: o.exceptions };
  });

export const getSalesKpiSummary = async (period: DashboardPeriod) =>
  timedDashboardSection("sales.kpi", async () => {
    const d = await loadAreaDataset("sales", period);
    const o = buildSalesMain(d);
    return { currency: d.currency, data: o.summary };
  });
export const getSalesModuleCards = async (period: DashboardPeriod) =>
  timedDashboardSection("sales.module_cards", async () => {
    const d = await loadAreaDataset("sales", period);
    const o = buildSalesMain(d);
    return { currency: d.currency, data: o.moduleCards };
  });
export const getSalesTrend = async (period: DashboardPeriod) =>
  timedDashboardSection("sales.trend", async () => {
    const d = await loadAreaDataset("sales", period);
    const o = buildSalesMain(d);
    return { currency: d.currency, data: o.trend };
  });
export const getSalesFunnel = async (period: DashboardPeriod) =>
  timedDashboardSection("sales.funnel", async () => {
    const d = await loadAreaDataset("sales", period);
    const o = buildSalesMain(d);
    return { currency: d.currency, data: o.funnel };
  });
export const getSalesTopPartners = async (period: DashboardPeriod) =>
  timedDashboardSection("sales.top_partners", async () => {
    const d = await loadAreaDataset("sales", period);
    const o = buildSalesMain(d);
    return { currency: d.currency, data: o.topPartners };
  });
export const getSalesExceptions = async (period: DashboardPeriod) =>
  timedDashboardSection("sales.exceptions", async () => {
    const d = await loadAreaDataset("sales", period);
    const o = buildSalesMain(d);
    return { currency: d.currency, data: o.exceptions };
  });

export const getInventoryKpiSummary = async (period: DashboardPeriod) =>
  timedDashboardSection("inventory.kpi", async () => {
    const d = await loadInventoryDataset(period);
    const o = buildInventoryMain(d);
    return { currency: d.currency, data: o.summary };
  });
export const getInventoryModuleCards = async (period: DashboardPeriod) =>
  timedDashboardSection("inventory.module_cards", async () => {
    const d = await loadInventoryDataset(period);
    const o = buildInventoryMain(d);
    return { currency: d.currency, data: o.moduleCards };
  });
export const getInventoryTrend = async (period: DashboardPeriod) =>
  timedDashboardSection("inventory.trend", async () => {
    const d = await loadInventoryDataset(period);
    const o = buildInventoryMain(d);
    return { currency: d.currency, data: o.trend };
  });
export const getInventoryFunnel = async (period: DashboardPeriod) =>
  timedDashboardSection("inventory.funnel", async () => {
    const d = await loadInventoryDataset(period);
    const o = buildInventoryMain(d);
    return { currency: d.currency, data: o.funnel };
  });
export const getInventoryTopPartners = async (period: DashboardPeriod) =>
  timedDashboardSection("inventory.top_partners", async () => {
    const d = await loadInventoryDataset(period);
    const o = buildInventoryMain(d);
    return { currency: d.currency, data: o.topPartners };
  });
export const getInventoryExceptions = async (period: DashboardPeriod) =>
  timedDashboardSection("inventory.exceptions", async () => {
    const d = await loadInventoryDataset(period);
    const o = buildInventoryMain(d);
    return { currency: d.currency, data: o.exceptions };
  });

export const getPurchaseSummary = (period = "yearly") => getPurchaseKpiSummary(toPeriod(period));
export const getSalesSummary = (period = "yearly") => getSalesKpiSummary(toPeriod(period));
export const getDashboardStats = async (period = "yearly") => {
  const p = toPeriod(period);
  const [pu, sa] = await Promise.all([getPurchaseKpiSummary(p), getSalesKpiSummary(p)]);
  return { currency: pu.currency, data: { purchase: pu.data, sales: sa.data } };
};

export const getDashboard = (period: DashboardPeriod) => getLegacyDashboard(period);

export const getPurchaseDashboard = async (period: DashboardPeriod) => {
  const d = await loadAreaDataset("purchase", period);
  return buildPurchaseMain(d);
};

export const getSalesDashboard = async (period: DashboardPeriod) => {
  const d = await loadAreaDataset("sales", period);
  return buildSalesMain(d);
};

export { getInventoryDashboard };

export const dashboardService = {
  getDashboard,
  getDashboardStats,
  getInventoryDashboard,
  getInventoryExceptions,
  getInventoryFunnel,
  getInventoryKpiSummary,
  getInventoryModuleCards,
  getInventoryTopPartners,
  getInventoryTrend,
  getPurchaseDashboard,
  getPurchaseExceptions,
  getPurchaseFunnel,
  getPurchaseKpiSummary,
  getPurchaseModuleCards,
  getPurchaseSummary,
  getPurchaseTopPartners,
  getPurchaseTrend,
  getSalesDashboard,
  getSalesExceptions,
  getSalesFunnel,
  getSalesKpiSummary,
  getSalesModuleCards,
  getSalesSummary,
  getSalesTopPartners,
  getSalesTrend,
};
