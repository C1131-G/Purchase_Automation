// Inventory dashboard builder — matching hana exactly.

import { getCachedData } from "@/core/utils/cache.util";

import {
  calculateRatio,
  calculateTrend,
  countOpenDocuments,
  isOpenDocument,
  sumOpenTotals,
  sumTotals,
} from "./dashboard-calculations.util";
import { INVENTORY_MODULES, MODULE_HREFS, MODULE_LABELS } from "./dashboard-constants.util";
import { DASHBOARD_CACHE_TTL } from "./dashboard-constants.util";
import { getModuleDataset } from "./dashboard-data.util";
import { buildTrendBuckets } from "./dashboard-trend.util";
import {
  buildExceptionGroup,
  buildMetric,
  buildQuickLinks,
  sortByDateDescending,
  sortByOpenValue,
} from "./dashboard-view.util";
import type { InventoryDataset } from "./dashboard.inventory-data";
import type {
  DashboardExceptionGroup,
  DashboardFunnelStep,
  DashboardMainOutput,
  DashboardMetric,
  DashboardModuleCard,
} from "./dashboard.types";

const buildInventorySummary = (dataset: InventoryDataset): DashboardMetric[] => {
  const gr = getModuleDataset(dataset, "goodsReceipt");
  const gi = getModuleDataset(dataset, "goodsIssue");
  const tr = getModuleDataset(dataset, "transferRequest");
  const t = getModuleDataset(dataset, "transfer");
  return [
    buildMetric("total-items", "Total Items", dataset.itemStats.totalItems, "number"),
    buildMetric("on-hand-items", "On-Hand Items", dataset.itemStats.onHandItems, "number"),
    buildMetric("stock-valuation", "Stock Valuation", dataset.itemStats.stockValue, "currency"),
    buildMetric("on-order-value", "On-Order Value", dataset.itemStats.onOrderValue, "currency"),
    buildMetric("goods-receipt-val", "Goods Receipt Value", sumTotals(gr.current), "currency"),
    buildMetric("goods-issue-val", "Goods Issue Value", sumTotals(gi.current), "currency"),
    buildMetric(
      "inventory-transfer-val",
      "Inventory Transfer Value",
      sumTotals(t.current),
      "currency",
    ),
    buildMetric(
      "open-transfer-requests",
      "Open Transfer Requests",
      countOpenDocuments(tr.current),
      "number",
    ),
  ];
};

const buildInventoryModuleCards = (dataset: InventoryDataset): DashboardModuleCard[] => {
  const itemCard: DashboardModuleCard = {
    documentCount: dataset.itemStats.totalItems,
    href: MODULE_HREFS["itemMaster"],
    key: "itemMaster",
    label: MODULE_LABELS["itemMaster"],
    module: "itemMaster",
    openCount: dataset.itemStats.onHandItems,
    openValue: dataset.itemStats.onOrderValue,
    totalValue: dataset.itemStats.stockValue,
    trendPct: 0,
  };
  const flowCards = INVENTORY_MODULES.map((m) => {
    const ds = getModuleDataset(dataset, m);
    return {
      documentCount: ds.current.length,
      href: MODULE_HREFS[m],
      key: m,
      label: MODULE_LABELS[m],
      module: m,
      openCount: countOpenDocuments(ds.current),
      openValue: sumOpenTotals(ds.current),
      totalValue: sumTotals(ds.current),
      trendPct: calculateTrend(sumTotals(ds.current), sumTotals(ds.previous)),
    };
  });
  return [itemCard, ...flowCards];
};

const buildInventoryFunnel = (dataset: InventoryDataset): DashboardFunnelStep[] => {
  const cards = buildInventoryModuleCards(dataset);
  const orderedKeys = ["itemMaster", "goodsReceipt", "goodsIssue", "transferRequest", "transfer"];
  return orderedKeys.map((key, idx) => {
    const card = cards.find((c) => c.key === key) ?? cards[0];
    const prevCard = idx > 0 ? cards.find((c) => c.key === orderedKeys[idx - 1]) : card;
    let convPct = 100;
    if (idx > 0 && prevCard && prevCard.totalValue > 0) {
      convPct = calculateRatio(card.totalValue, prevCard.totalValue);
    }
    return {
      conversionPct: convPct,
      documentCount: card.documentCount,
      href: card.href,
      key,
      label: card.label,
      module: key,
      openCount: card.openCount,
      openValue: card.openValue,
      totalValue: card.totalValue,
    };
  });
};

const buildInventoryExceptions = (dataset: InventoryDataset): DashboardExceptionGroup[] => {
  const tr = getModuleDataset(dataset, "transferRequest");
  const gr = getModuleDataset(dataset, "goodsReceipt");
  const gi = getModuleDataset(dataset, "goodsIssue");
  const t = getModuleDataset(dataset, "transfer");
  return [
    buildExceptionGroup(
      "open-transfer-requests",
      "Open Transfer Requests",
      "transferRequest",
      sortByOpenValue(tr.current.filter((d) => isOpenDocument(d))),
    ),
    buildExceptionGroup(
      "recent-goods-receipts",
      "Recent Goods Receipts",
      "goodsReceipt",
      sortByDateDescending(gr.current),
    ),
    buildExceptionGroup(
      "recent-goods-issues",
      "Recent Goods Issues",
      "goodsIssue",
      sortByDateDescending(gi.current),
    ),
    buildExceptionGroup(
      "recent-transfers",
      "Recent Transfers",
      "transfer",
      sortByDateDescending(t.current),
    ),
  ];
};

export const buildInventoryMain = (dataset: InventoryDataset): DashboardMainOutput => ({
  currency: dataset.currency,
  exceptions: buildInventoryExceptions(dataset),
  funnel: buildInventoryFunnel(dataset),
  moduleCards: buildInventoryModuleCards(dataset),
  period: dataset.period,
  quickLinks: buildQuickLinks(INVENTORY_MODULES),
  summary: buildInventorySummary(dataset),
  topPartners: dataset.warehouseGroups,
  trend: {
    granularity: dataset.granularity,
    points: buildTrendBuckets(dataset),
    title: "Inventory Flow Trend",
  },
});

// Legacy
export const getInventoryDashboard = () =>
  getCachedData(
    "dash:inventory",
    async () => {
      const { loadInventoryDataset } = await import("./dashboard.inventory-data");
      const d = await loadInventoryDataset("month");
      const o = buildInventoryMain(d);
      return {
        exceptions: o.exceptions,
        funnel: o.funnel,
        moduleCards: o.moduleCards,
        summary: o.summary,
        topPartners: o.topPartners,
        trend: o.trend,
      };
    },
    DASHBOARD_CACHE_TTL,
  );
