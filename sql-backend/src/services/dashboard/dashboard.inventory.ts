// Inventory dashboard builder — matching hana exactly.

import { getCachedData } from "@/core/utils/cache";

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
  const goodsReceipt = getModuleDataset(dataset, "goodsReceipt");
  const goodsIssue = getModuleDataset(dataset, "goodsIssue");
  const transferRequest = getModuleDataset(dataset, "transferRequest");
  const transferModule = getModuleDataset(dataset, "transfer");
  return [
    buildMetric("total-items", "Total Items", dataset.itemStats.totalItems, "number"),
    buildMetric("on-hand-items", "On-Hand Items", dataset.itemStats.onHandItems, "number"),
    buildMetric("stock-valuation", "Stock Valuation", dataset.itemStats.stockValue, "currency"),
    buildMetric("on-order-value", "On-Order Value", dataset.itemStats.onOrderValue, "currency"),
    buildMetric("goods-receipt-val", "Goods Receipt Value", sumTotals(goodsReceipt.current), "currency"),
    buildMetric("goods-issue-val", "Goods Issue Value", sumTotals(goodsIssue.current), "currency"),
    buildMetric(
      "inventory-transfer-val",
      "Inventory Transfer Value",
      sumTotals(transferModule.current),
      "currency",
    ),
    buildMetric(
      "open-transfer-requests",
      "Open Transfer Requests",
      countOpenDocuments(transferRequest.current),
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
  const flowCards = INVENTORY_MODULES.map((moduleKey) => {
    const moduleDataset = getModuleDataset(dataset, moduleKey);
    return {
      documentCount: moduleDataset.current.length,
      href: MODULE_HREFS[moduleKey],
      key: moduleKey,
      label: MODULE_LABELS[moduleKey],
      module: moduleKey,
      openCount: countOpenDocuments(moduleDataset.current),
      openValue: sumOpenTotals(moduleDataset.current),
      totalValue: sumTotals(moduleDataset.current),
      trendPct: calculateTrend(sumTotals(moduleDataset.current), sumTotals(moduleDataset.previous)),
    };
  });
  return [itemCard, ...flowCards];
};

const buildInventoryFunnel = (dataset: InventoryDataset): DashboardFunnelStep[] => {
  const cards = buildInventoryModuleCards(dataset);
  const orderedKeys = ["itemMaster", "goodsReceipt", "goodsIssue", "transferRequest", "transfer"];
  return orderedKeys.map((key, idx) => {
    const card = cards.find((moduleCard) => moduleCard.key === key) ?? cards[0];
    const prevCard =
      idx > 0 ? cards.find((moduleCard) => moduleCard.key === orderedKeys[idx - 1]) : card;
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
  const transferRequest = getModuleDataset(dataset, "transferRequest");
  const goodsReceipt = getModuleDataset(dataset, "goodsReceipt");
  const goodsIssue = getModuleDataset(dataset, "goodsIssue");
  const transferModule = getModuleDataset(dataset, "transfer");
  return [
    buildExceptionGroup(
      "open-transfer-requests",
      "Open Transfer Requests",
      "transferRequest",
      sortByOpenValue(transferRequest.current.filter((document) => isOpenDocument(document))),
    ),
    buildExceptionGroup(
      "recent-goods-receipts",
      "Recent Goods Receipts",
      "goodsReceipt",
      sortByDateDescending(goodsReceipt.current),
    ),
    buildExceptionGroup(
      "recent-goods-issues",
      "Recent Goods Issues",
      "goodsIssue",
      sortByDateDescending(goodsIssue.current),
    ),
    buildExceptionGroup(
      "recent-transfers",
      "Recent Transfers",
      "transfer",
      sortByDateDescending(transferModule.current),
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
      const dataset = await loadInventoryDataset("month");
      const overview = buildInventoryMain(dataset);
      return {
        exceptions: overview.exceptions,
        funnel: overview.funnel,
        moduleCards: overview.moduleCards,
        summary: overview.summary,
        topPartners: overview.topPartners,
        trend: overview.trend,
      };
    },
    DASHBOARD_CACHE_TTL,
  );
