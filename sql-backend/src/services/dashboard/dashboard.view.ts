// Dashboard view builders — matching hana + legacy compat.

import type {
  DashboardExceptionGroup,
  DashboardExceptionItem,
  DashboardMetric,
  DashboardModuleCard,
  DashboardQuickLink,
  DocumentModule,
} from "./dashboard.types";
import {
  calculateTrend,
  countOpenDocuments,
  getOpenValue,
  sumOpenTotals,
  sumTotals,
} from "./dashboard.calculations";
import { MODULE_HREFS, MODULE_LABELS } from "./dashboard.constants";
import type { ModuleDataset, RawDashboardDocument } from "./dashboard.types";
import { getCachedData } from "@/core/utils/cache";
import { DASHBOARD_CACHE_TTL } from "./dashboard.constants";
import { getPurchaseSummary, getSalesSummary, getInventorySummary } from "./dashboard.data";
import { getPurchaseTrend, getSalesTrend } from "./dashboard.trend";
import { getTopVendors, getTopCustomers } from "./dashboard.partners";
import type { DashboardData } from "./dashboard.types";

export const buildMetric = (
  key: string,
  label: string,
  value: number,
  format: DashboardMetric["format"],
): DashboardMetric => ({ key, label, value: Number(value.toFixed(2)), format });
export const buildModuleCard = (dataset: ModuleDataset): DashboardModuleCard => ({
  key: dataset.module,
  label: MODULE_LABELS[dataset.module],
  module: dataset.module,
  href: MODULE_HREFS[dataset.module],
  documentCount: dataset.current.length,
  totalValue: sumTotals(dataset.current),
  openCount: countOpenDocuments(dataset.current),
  openValue: sumOpenTotals(dataset.current),
  trendPct: calculateTrend(sumTotals(dataset.current), sumTotals(dataset.previous)),
});

const isInventoryModule = (module: DocumentModule): boolean =>
  ["goodsReceipt", "goodsIssue", "transferRequest", "transfer"].includes(module);
const toExceptionItem = (doc: RawDashboardDocument): DashboardExceptionItem => {
  const isInv = isInventoryModule(doc.module);
  return {
    module: doc.module,
    docNum: doc.docNum,
    cardCode: doc.cardCode || undefined,
    cardName: doc.cardName || undefined,
    docDate: doc.docDate,
    docStatus: doc.docStatus || undefined,
    docTotal: Number(doc.docTotal.toFixed(2)),
    openValue: Number(getOpenValue(doc).toFixed(2)),
    href: isInv
      ? `${MODULE_HREFS[doc.module]}?DocNum=${doc.docNum}`
      : `${MODULE_HREFS[doc.module]}/${doc.docNum}/edit`,
  };
};

export const sortByOpenValue = (docs: RawDashboardDocument[]): RawDashboardDocument[] =>
  [...docs].sort((l, r) => getOpenValue(r) - getOpenValue(l));
export const sortByDateDescending = (docs: RawDashboardDocument[]): RawDashboardDocument[] =>
  [...docs].sort((l, r) => r.docDate.localeCompare(l.docDate));
export const buildExceptionGroup = (
  key: string,
  title: string,
  module: DocumentModule,
  docs: RawDashboardDocument[],
): DashboardExceptionGroup => ({
  key,
  title,
  module,
  items: docs.slice(0, 5).map(toExceptionItem),
});
export const buildQuickLinks = (modules: DocumentModule[]): DashboardQuickLink[] =>
  modules.map((m) => ({
    label: MODULE_LABELS[m],
    href: MODULE_HREFS[m],
    module: m,
    description: `Open ${MODULE_LABELS[m]} details`,
  }));

// Legacy compat
export const getDashboard = async (
  period: "week" | "month" | "year" | "all",
): Promise<DashboardData> => {
  return getCachedData(
    `dash:full:${period}`,
    async () => {
      const [ps, ss, inv, pt, st, tv, tc] = await Promise.all([
        getPurchaseSummary(period),
        getSalesSummary(period),
        getInventorySummary(),
        getPurchaseTrend("month"),
        getSalesTrend("month"),
        getTopVendors(),
        getTopCustomers(),
      ]);
      return {
        summary: { ...ps, ...ss },
        purchaseTrend: pt,
        salesTrend: st,
        topVendors: tv,
        topCustomers: tc,
        inventory: inv,
      };
    },
    DASHBOARD_CACHE_TTL,
  );
};
