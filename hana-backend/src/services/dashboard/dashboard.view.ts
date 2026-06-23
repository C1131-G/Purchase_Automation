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

export const buildMetric = (
  key: string,
  label: string,
  value: number,
  format: DashboardMetric["format"],
): DashboardMetric => ({
  key,
  label,
  value: Number(value.toFixed(2)),
  format,
});

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

const isInventoryModule = (module: DocumentModule): boolean => {
  return ["goodsReceipt", "goodsIssue", "transferRequest", "transfer"].includes(module);
};

const toExceptionItem = (doc: RawDashboardDocument): DashboardExceptionItem => {
  const isInventory = isInventoryModule(doc.module);
  const href = isInventory
    ? `${MODULE_HREFS[doc.module]}?DocNum=${doc.docNum}`
    : `${MODULE_HREFS[doc.module]}/${doc.docNum}/edit`;

  return {
    module: doc.module,
    docNum: doc.docNum,
    cardCode: doc.cardCode || undefined,
    cardName: doc.cardName || undefined,
    docDate: doc.docDate,
    docStatus: doc.docStatus || undefined,
    docTotal: Number(doc.docTotal.toFixed(2)),
    openValue: Number(getOpenValue(doc).toFixed(2)),
    href,
  };
};

export const sortByOpenValue = (docs: RawDashboardDocument[]): RawDashboardDocument[] =>
  [...docs].sort((left, right) => getOpenValue(right) - getOpenValue(left));

export const sortByDateDescending = (docs: RawDashboardDocument[]): RawDashboardDocument[] =>
  [...docs].sort((left, right) => right.docDate.localeCompare(left.docDate));

export const buildExceptionGroup = (
  key: string,
  title: string,
  module: DocumentModule,
  docs: RawDashboardDocument[],
): DashboardExceptionGroup => ({
  key,
  title,
  module,
  items: docs.slice(0, 5).map((doc) => toExceptionItem(doc)),
});

export const buildQuickLinks = (modules: DocumentModule[]): DashboardQuickLink[] =>
  modules.map((module) => ({
    label: MODULE_LABELS[module],
    href: MODULE_HREFS[module],
    module,
    description: `Open ${MODULE_LABELS[module]} details`,
  }));
