// Dashboard view builders — matching hana + Number(legacy) compat.

import { getCachedData } from "@/core/utils/cache";

import {
  calculateTrend,
  countOpenDocuments,
  getOpenValue,
  sumOpenTotals,
  sumTotals,
} from "./dashboard-calculations.util";
import { MODULE_HREFS, MODULE_LABELS, DASHBOARD_CACHE_TTL } from "./dashboard-constants.util";
import { getTopVendors, getTopCustomers } from "./dashboard-partners.util";
import { getPurchaseTrend, getSalesTrend } from "./dashboard-trend.util";
import {
  getPurchaseSummary,
  getSalesSummary,
  getInventorySummary,
} from "./dashboard.legacy-summary";
import type {
  DashboardExceptionGroup,
  DashboardExceptionItem,
  DashboardMetric,
  DashboardModuleCard,
  DashboardQuickLink,
  DocumentModule,
} from "./dashboard.types";
import type { ModuleDataset, RawDashboardDocument } from "./dashboard.types";
import type { DashboardData } from "./dashboard.types";

export const buildMetric = (
  key: string,
  label: string,
  value: number,
  format: DashboardMetric["format"],
): DashboardMetric => ({ format, key, label, value: Number(value.toFixed(2)) });
export const buildModuleCard = (dataset: ModuleDataset): DashboardModuleCard => ({
  documentCount: dataset.current.length,
  href: MODULE_HREFS[dataset.module],
  key: dataset.module,
  label: MODULE_LABELS[dataset.module],
  module: dataset.module,
  openCount: countOpenDocuments(dataset.current),
  openValue: sumOpenTotals(dataset.current),
  totalValue: sumTotals(dataset.current),
  trendPct: calculateTrend(sumTotals(dataset.current), sumTotals(dataset.previous)),
});

const isInventoryModule = (module: DocumentModule): boolean =>
  ["goodsReceipt", "goodsIssue", "transferRequest", "transfer"].includes(module);
const toExceptionItem = (doc: RawDashboardDocument): DashboardExceptionItem => {
  const isInv = isInventoryModule(doc.module);
  return {
    cardCode: doc.cardCode || undefined,
    cardName: doc.cardName || undefined,
    docDate: doc.docDate,
    docNum: doc.docNum,
    docStatus: doc.docStatus || undefined,
    docTotal: Number(doc.docTotal.toFixed(2)),
    href: isInv
      ? `${MODULE_HREFS[doc.module]}?DocNum=${doc.docNum}`
      : `${MODULE_HREFS[doc.module]}/${doc.docNum}/edit`,
    module: doc.module,
    openValue: Number(getOpenValue(doc).toFixed(2)),
  };
};

export const sortByOpenValue = (docs: RawDashboardDocument[]): RawDashboardDocument[] =>
  [...docs].toSorted((left, right) => getOpenValue(right) - getOpenValue(left));
export const sortByDateDescending = (docs: RawDashboardDocument[]): RawDashboardDocument[] =>
  [...docs].toSorted((left, right) => right.docDate.localeCompare(left.docDate));
export const buildExceptionGroup = (
  key: string,
  title: string,
  module: DocumentModule,
  docs: RawDashboardDocument[],
): DashboardExceptionGroup => ({
  items: docs.slice(0, 5).map(toExceptionItem),
  key,
  module,
  title,
});
export const buildQuickLinks = (modules: DocumentModule[]): DashboardQuickLink[] =>
  modules.map((moduleKey) => ({
    description: `Open ${MODULE_LABELS[moduleKey]} details`,
    href: MODULE_HREFS[moduleKey],
    label: MODULE_LABELS[moduleKey],
    module: moduleKey,
  }));

// Legacy compat
export const getDashboard = async (
  period: "week" | "month" | "year" | "all",
): Promise<DashboardData> =>
  getCachedData(
    `dash:full:${period}`,
    async () => {
      const [
        purchaseSummary,
        salesSummary,
        inventorySummary,
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
        inventory: inventorySummary,
        purchaseTrend,
        salesTrend,
        summary: { ...purchaseSummary, ...salesSummary },
        topCustomers,
        topVendors,
      } as DashboardData;
    },
    DASHBOARD_CACHE_TTL,
  );
