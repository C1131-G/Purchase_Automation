// Inventory dashboard builder — matching hana exactly.

import type {
  DashboardExceptionGroup,
  DashboardFunnelStep,
  DashboardMainOutput,
  DashboardMetric,
  DashboardModuleCard,
} from "./dashboard.types";
import {
  calculateRatio,
  calculateTrend,
  countOpenDocuments,
  isOpenDocument,
  sumOpenTotals,
  sumTotals,
} from "./dashboard.calculations";
import { INVENTORY_MODULES, MODULE_HREFS, MODULE_LABELS } from "./dashboard.constants";
import { getModuleDataset } from "./dashboard.data";
import { buildTrendBuckets } from "./dashboard.trend";
import type { InventoryDataset } from "./inventory-dashboard-data";
import { DASHBOARD_CACHE_TTL } from "./dashboard.constants";
import { getCachedData } from "@/core/utils/cache";
import {
  buildExceptionGroup,
  buildMetric,
  buildQuickLinks,
  sortByDateDescending,
  sortByOpenValue,
} from "./dashboard.view";

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
    key: "itemMaster",
    label: MODULE_LABELS["itemMaster"],
    module: "itemMaster",
    href: MODULE_HREFS["itemMaster"],
    documentCount: dataset.itemStats.totalItems,
    totalValue: dataset.itemStats.stockValue,
    openCount: dataset.itemStats.onHandItems,
    openValue: dataset.itemStats.onOrderValue,
    trendPct: 0,
  };
  const flowCards = INVENTORY_MODULES.map((m) => {
    const ds = getModuleDataset(dataset, m);
    return {
      key: m,
      label: MODULE_LABELS[m],
      module: m,
      href: MODULE_HREFS[m],
      documentCount: ds.current.length,
      totalValue: sumTotals(ds.current),
      openCount: countOpenDocuments(ds.current),
      openValue: sumOpenTotals(ds.current),
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
    if (idx > 0 && prevCard && prevCard.totalValue > 0)
      convPct = calculateRatio(card.totalValue, prevCard.totalValue);
    return {
      key,
      label: card.label,
      module: key,
      href: card.href,
      documentCount: card.documentCount,
      totalValue: card.totalValue,
      openCount: card.openCount,
      openValue: card.openValue,
      conversionPct: convPct,
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
  period: dataset.period,
  summary: buildInventorySummary(dataset),
  moduleCards: buildInventoryModuleCards(dataset),
  funnel: buildInventoryFunnel(dataset),
  trend: {
    title: "Inventory Flow Trend",
    granularity: dataset.granularity,
    points: buildTrendBuckets(dataset),
  },
  topPartners: dataset.warehouseGroups,
  exceptions: buildInventoryExceptions(dataset),
  quickLinks: buildQuickLinks(INVENTORY_MODULES),
});

// Legacy
export const getInventoryDashboard = async () =>
  getCachedData(
    "dash:inventory",
    async () => {
      const { loadInventoryDataset } = await import("./inventory-dashboard-data");
      const d = await loadInventoryDataset("month");
      const o = buildInventoryMain(d);
      return {
        summary: o.summary,
        moduleCards: o.moduleCards,
        funnel: o.funnel,
        trend: o.trend,
        topPartners: o.topPartners,
        exceptions: o.exceptions,
      };
    },
    DASHBOARD_CACHE_TTL,
  );
