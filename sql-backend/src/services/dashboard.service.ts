// Dashboard service: Hana-compatible orchestrator for all 18 streaming endpoints.

import type { DashboardPeriod } from "./dashboard/dashboard.types";
import { loadAreaDataset } from "./dashboard/dashboard.data";
import { loadInventoryDataset } from "./dashboard/inventory-dashboard-data";
import { buildPurchaseMain } from "./dashboard/purchase-dashboard";
import { buildSalesMain } from "./dashboard/sales-dashboard";
import { buildInventoryMain, getInventoryDashboard } from "./dashboard/inventory-dashboard";
import { getDashboard as getLegacyDashboard } from "./dashboard/dashboard.view";

const toPeriod = (period: string): DashboardPeriod =>
  period === "weekly" || period === "week"
    ? "week"
    : period === "yearly" || period === "year"
      ? "year"
      : period === "all"
        ? "all"
        : "month";

export const getPurchaseKpiSummary = async (period: DashboardPeriod) => {
  const d = await loadAreaDataset("purchase", period);
  const o = buildPurchaseMain(d);
  return { data: o.summary, currency: d.currency };
};
export const getPurchaseModuleCards = async (period: DashboardPeriod) => {
  const d = await loadAreaDataset("purchase", period);
  const o = buildPurchaseMain(d);
  return { data: o.moduleCards, currency: d.currency };
};
export const getPurchaseTrend = async (period: DashboardPeriod) => {
  const d = await loadAreaDataset("purchase", period);
  const o = buildPurchaseMain(d);
  return { data: o.trend, currency: d.currency };
};
export const getPurchaseFunnel = async (period: DashboardPeriod) => {
  const d = await loadAreaDataset("purchase", period);
  const o = buildPurchaseMain(d);
  return { data: o.funnel, currency: d.currency };
};
export const getPurchaseTopPartners = async (period: DashboardPeriod) => {
  const d = await loadAreaDataset("purchase", period);
  const o = buildPurchaseMain(d);
  return { data: o.topPartners, currency: d.currency };
};
export const getPurchaseExceptions = async (period: DashboardPeriod) => {
  const d = await loadAreaDataset("purchase", period);
  const o = buildPurchaseMain(d);
  return { data: o.exceptions, currency: d.currency };
};

export const getSalesKpiSummary = async (period: DashboardPeriod) => {
  const d = await loadAreaDataset("sales", period);
  const o = buildSalesMain(d);
  return { data: o.summary, currency: d.currency };
};
export const getSalesModuleCards = async (period: DashboardPeriod) => {
  const d = await loadAreaDataset("sales", period);
  const o = buildSalesMain(d);
  return { data: o.moduleCards, currency: d.currency };
};
export const getSalesTrend = async (period: DashboardPeriod) => {
  const d = await loadAreaDataset("sales", period);
  const o = buildSalesMain(d);
  return { data: o.trend, currency: d.currency };
};
export const getSalesFunnel = async (period: DashboardPeriod) => {
  const d = await loadAreaDataset("sales", period);
  const o = buildSalesMain(d);
  return { data: o.funnel, currency: d.currency };
};
export const getSalesTopPartners = async (period: DashboardPeriod) => {
  const d = await loadAreaDataset("sales", period);
  const o = buildSalesMain(d);
  return { data: o.topPartners, currency: d.currency };
};
export const getSalesExceptions = async (period: DashboardPeriod) => {
  const d = await loadAreaDataset("sales", period);
  const o = buildSalesMain(d);
  return { data: o.exceptions, currency: d.currency };
};

export const getInventoryKpiSummary = async (period: DashboardPeriod) => {
  const d = await loadInventoryDataset(period);
  const o = buildInventoryMain(d);
  return { data: o.summary, currency: d.currency };
};
export const getInventoryModuleCards = async (period: DashboardPeriod) => {
  const d = await loadInventoryDataset(period);
  const o = buildInventoryMain(d);
  return { data: o.moduleCards, currency: d.currency };
};
export const getInventoryTrend = async (period: DashboardPeriod) => {
  const d = await loadInventoryDataset(period);
  const o = buildInventoryMain(d);
  return { data: o.trend, currency: d.currency };
};
export const getInventoryFunnel = async (period: DashboardPeriod) => {
  const d = await loadInventoryDataset(period);
  const o = buildInventoryMain(d);
  return { data: o.funnel, currency: d.currency };
};
export const getInventoryTopPartners = async (period: DashboardPeriod) => {
  const d = await loadInventoryDataset(period);
  const o = buildInventoryMain(d);
  return { data: o.topPartners, currency: d.currency };
};
export const getInventoryExceptions = async (period: DashboardPeriod) => {
  const d = await loadInventoryDataset(period);
  const o = buildInventoryMain(d);
  return { data: o.exceptions, currency: d.currency };
};

export const getPurchaseSummary = async (period: string = "yearly") =>
  getPurchaseKpiSummary(toPeriod(period));
export const getSalesSummary = async (period: string = "yearly") =>
  getSalesKpiSummary(toPeriod(period));
export const getDashboardStats = async (period: string = "yearly") => {
  const p = toPeriod(period);
  const [pu, sa] = await Promise.all([getPurchaseKpiSummary(p), getSalesKpiSummary(p)]);
  return { data: { purchase: pu.data, sales: sa.data }, currency: pu.currency };
};

/** Full legacy dashboard snapshot. */
export const getDashboard = async (period: DashboardPeriod) => getLegacyDashboard(period);

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
