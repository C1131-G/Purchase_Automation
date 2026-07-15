import { timedDashboardSection } from "@/core/observability/dashboard";
import {
  getPurchaseSummary as getPurchaseSummaryRaw,
  getSalesSummary as getSalesSummaryRaw,
  getPurchaseKpiSummary as getPurchaseKpiSummaryRaw,
  getSalesKpiSummary as getSalesKpiSummaryRaw,
  getPurchaseModuleCards as getPurchaseModuleCardsRaw,
  getSalesModuleCards as getSalesModuleCardsRaw,
  getPurchaseTrend as getPurchaseTrendRaw,
  getSalesTrend as getSalesTrendRaw,
  getPurchaseFunnel as getPurchaseFunnelRaw,
  getSalesFunnel as getSalesFunnelRaw,
  getPurchaseTopPartners as getPurchaseTopPartnersRaw,
  getSalesTopPartners as getSalesTopPartnersRaw,
  getPurchaseExceptions as getPurchaseExceptionsRaw,
  getSalesExceptions as getSalesExceptionsRaw,
  getInventoryKpiSummary as getInventoryKpiSummaryRaw,
  getInventoryModuleCards as getInventoryModuleCardsRaw,
  getInventoryTrend as getInventoryTrendRaw,
  getInventoryFunnel as getInventoryFunnelRaw,
  getInventoryTopPartners as getInventoryTopPartnersRaw,
  getInventoryExceptions as getInventoryExceptionsRaw,
} from "./dashboard.queries";

type AnyFn = (...args: never[]) => Promise<unknown> | unknown;

function instrumentSection<T extends AnyFn>(section: string, run: T): T {
  return ((...args: Parameters<T>) =>
    timedDashboardSection(section, () => run(...args) as ReturnType<T>)) as T;
}

export const getPurchaseSummary = instrumentSection("purchase.summary", getPurchaseSummaryRaw);
export const getSalesSummary = instrumentSection("sales.summary", getSalesSummaryRaw);
export const getPurchaseKpiSummary = instrumentSection("purchase.kpi", getPurchaseKpiSummaryRaw);
export const getSalesKpiSummary = instrumentSection("sales.kpi", getSalesKpiSummaryRaw);
export const getPurchaseModuleCards = instrumentSection(
  "purchase.module_cards",
  getPurchaseModuleCardsRaw,
);
export const getSalesModuleCards = instrumentSection("sales.module_cards", getSalesModuleCardsRaw);
export const getPurchaseTrend = instrumentSection("purchase.trend", getPurchaseTrendRaw);
export const getSalesTrend = instrumentSection("sales.trend", getSalesTrendRaw);
export const getPurchaseFunnel = instrumentSection("purchase.funnel", getPurchaseFunnelRaw);
export const getSalesFunnel = instrumentSection("sales.funnel", getSalesFunnelRaw);
export const getPurchaseTopPartners = instrumentSection(
  "purchase.top_partners",
  getPurchaseTopPartnersRaw,
);
export const getSalesTopPartners = instrumentSection("sales.top_partners", getSalesTopPartnersRaw);
export const getPurchaseExceptions = instrumentSection(
  "purchase.exceptions",
  getPurchaseExceptionsRaw,
);
export const getSalesExceptions = instrumentSection("sales.exceptions", getSalesExceptionsRaw);
export const getInventoryKpiSummary = instrumentSection("inventory.kpi", getInventoryKpiSummaryRaw);
export const getInventoryModuleCards = instrumentSection(
  "inventory.module_cards",
  getInventoryModuleCardsRaw,
);
export const getInventoryTrend = instrumentSection("inventory.trend", getInventoryTrendRaw);
export const getInventoryFunnel = instrumentSection("inventory.funnel", getInventoryFunnelRaw);
export const getInventoryTopPartners = instrumentSection(
  "inventory.top_partners",
  getInventoryTopPartnersRaw,
);
export const getInventoryExceptions = instrumentSection(
  "inventory.exceptions",
  getInventoryExceptionsRaw,
);

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
