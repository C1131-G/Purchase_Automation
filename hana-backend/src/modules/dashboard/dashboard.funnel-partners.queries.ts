// Dashboard funnel, partner Pareto, and exception sections (purchase + sales).

import { loadAreaDataset } from "@/services/dashboard/dashboard.data";

import { buildPurchaseMain } from "@/services/dashboard/purchase-dashboard";
import { buildSalesMain } from "@/services/dashboard/sales-dashboard";
import type {
  DashboardPeriod,
  DashboardFunnelStep,
  DashboardPartnerGroup,
  DashboardExceptionGroup,
} from "@/services/dashboard/dashboard.types";

import type { DashboardSectionResponse } from "./dashboard.summary-kpi.queries";

export const getPurchaseFunnel = async (
  period: DashboardPeriod,
  dbName: string,
): Promise<DashboardSectionResponse<DashboardFunnelStep[]>> => {
  const dataset = await loadAreaDataset("purchase", period, dbName);
  const output = buildPurchaseMain(dataset);
  return { data: output.funnel, currency: dataset.currency };
};

export const getSalesFunnel = async (
  period: DashboardPeriod,
  dbName: string,
): Promise<DashboardSectionResponse<DashboardFunnelStep[]>> => {
  const dataset = await loadAreaDataset("sales", period, dbName);
  const output = buildSalesMain(dataset);
  return { data: output.funnel, currency: dataset.currency };
};

export const getPurchaseTopPartners = async (
  period: DashboardPeriod,
  dbName: string,
): Promise<DashboardSectionResponse<DashboardPartnerGroup[]>> => {
  const dataset = await loadAreaDataset("purchase", period, dbName);
  const output = buildPurchaseMain(dataset);
  return { data: output.topPartners, currency: dataset.currency };
};

export const getSalesTopPartners = async (
  period: DashboardPeriod,
  dbName: string,
): Promise<DashboardSectionResponse<DashboardPartnerGroup[]>> => {
  const dataset = await loadAreaDataset("sales", period, dbName);
  const output = buildSalesMain(dataset);
  return { data: output.topPartners, currency: dataset.currency };
};

export const getPurchaseExceptions = async (
  period: DashboardPeriod,
  dbName: string,
): Promise<DashboardSectionResponse<DashboardExceptionGroup[]>> => {
  const dataset = await loadAreaDataset("purchase", period, dbName);
  const output = buildPurchaseMain(dataset);
  return { data: output.exceptions, currency: dataset.currency };
};

export const getSalesExceptions = async (
  period: DashboardPeriod,
  dbName: string,
): Promise<DashboardSectionResponse<DashboardExceptionGroup[]>> => {
  const dataset = await loadAreaDataset("sales", period, dbName);
  const output = buildSalesMain(dataset);
  return { data: output.exceptions, currency: dataset.currency };
};
