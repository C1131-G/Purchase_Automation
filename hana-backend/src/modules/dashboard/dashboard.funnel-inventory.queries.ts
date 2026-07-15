// Dashboard Service: Aggregates KPIs, charts, process funnel steps, exceptions, and partner Pareto tables.

import { loadAreaDataset } from "@/services/dashboard/dashboard.data";

import { buildPurchaseMain } from "@/services/dashboard/purchase-dashboard";
import { buildSalesMain } from "@/services/dashboard/sales-dashboard";
import { loadInventoryDataset } from "@/services/dashboard/inventory-dashboard-data";
import { buildInventoryMain } from "@/services/dashboard/inventory-dashboard";
import type {
  DashboardPeriod,
  DashboardMetric,
  DashboardModuleCard,
  DashboardTrend,
  DashboardFunnelStep,
  DashboardPartnerGroup,
  DashboardExceptionGroup,
} from "@/services/dashboard/dashboard.types";

import type { DashboardSectionResponse } from "./dashboard.summary-kpi.queries";

// Original purchase summary (backward compatibility)

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
