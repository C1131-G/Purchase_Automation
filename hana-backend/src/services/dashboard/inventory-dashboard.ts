// Inventory Dashboard Builder: Derives all 6 dashboard sections from a single
// pre-fetched and cached InventoryDataset snapshot. No database access here.

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
import {
  buildExceptionGroup,
  buildMetric,
  buildQuickLinks,
  sortByDateDescending,
  sortByOpenValue,
} from "./dashboard.view";

// ---------------------------------------------------------------------------
// KPI summary
// ---------------------------------------------------------------------------

const buildInventorySummary = (dataset: InventoryDataset): DashboardMetric[] => {
  const gr = getModuleDataset(dataset, "goodsReceipt");
  const gi = getModuleDataset(dataset, "goodsIssue");
  const tr = getModuleDataset(dataset, "transferRequest");
  const transfer = getModuleDataset(dataset, "transfer");

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
      sumTotals(transfer.current),
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

// ---------------------------------------------------------------------------
// Module cards (itemMaster + 4 flow modules)
// ---------------------------------------------------------------------------

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

  const flowCards: DashboardModuleCard[] = INVENTORY_MODULES.map((module) => {
    const ds = getModuleDataset(dataset, module);
    return {
      key: module,
      label: MODULE_LABELS[module],
      module,
      href: MODULE_HREFS[module],
      documentCount: ds.current.length,
      totalValue: sumTotals(ds.current),
      openCount: countOpenDocuments(ds.current),
      openValue: sumOpenTotals(ds.current),
      trendPct: calculateTrend(sumTotals(ds.current), sumTotals(ds.previous)),
    };
  });

  return [itemCard, ...flowCards];
};

// ---------------------------------------------------------------------------
// Funnel (itemMaster → GR → GI → TR → T)
// ---------------------------------------------------------------------------

const buildInventoryFunnel = (dataset: InventoryDataset): DashboardFunnelStep[] => {
  const cards = buildInventoryModuleCards(dataset);
  const orderedKeys = ["itemMaster", "goodsReceipt", "goodsIssue", "transferRequest", "transfer"];

  return orderedKeys.map((key, index) => {
    const card = cards.find((c) => c.key === key) ?? cards[0];
    const prevCard = index > 0 ? cards.find((c) => c.key === orderedKeys[index - 1]) : card;

    let conversionPct = 100;
    if (index > 0 && prevCard && prevCard.totalValue > 0) {
      conversionPct = calculateRatio(card.totalValue, prevCard.totalValue);
    }

    return {
      key,
      label: card.label,
      module: key,
      href: card.href,
      documentCount: card.documentCount,
      totalValue: card.totalValue,
      openCount: card.openCount,
      openValue: card.openValue,
      conversionPct,
    };
  });
};

// ---------------------------------------------------------------------------
// Exceptions (open TRs + recent flow docs)
// ---------------------------------------------------------------------------

const buildInventoryExceptions = (dataset: InventoryDataset): DashboardExceptionGroup[] => {
  const tr = getModuleDataset(dataset, "transferRequest");
  const gr = getModuleDataset(dataset, "goodsReceipt");
  const gi = getModuleDataset(dataset, "goodsIssue");
  const t = getModuleDataset(dataset, "transfer");

  const openTRs = sortByOpenValue(tr.current.filter((d) => isOpenDocument(d)));
  const recentGRs = sortByDateDescending(gr.current);
  const recentGIs = sortByDateDescending(gi.current);
  const recentTs = sortByDateDescending(t.current);

  return [
    buildExceptionGroup(
      "open-transfer-requests",
      "Open Transfer Requests",
      "transferRequest",
      openTRs,
    ),
    buildExceptionGroup(
      "recent-goods-receipts",
      "Recent Goods Receipts",
      "goodsReceipt",
      recentGRs,
    ),
    buildExceptionGroup("recent-goods-issues", "Recent Goods Issues", "goodsIssue", recentGIs),
    buildExceptionGroup("recent-transfers", "Recent Transfers", "transfer", recentTs),
  ];
};

// ---------------------------------------------------------------------------
// Main builder: computes all sections from the cached snapshot
// ---------------------------------------------------------------------------

export const buildInventoryMain = (dataset: InventoryDataset): DashboardMainOutput => ({
  currency: dataset.currency,
  period: dataset.period,
  summary: buildInventorySummary(dataset),
  moduleCards: buildInventoryModuleCards(dataset),
  funnel: buildInventoryFunnel(dataset),
  trend: {
    title: "Inventory Flow Trend",
    granularity: dataset.granularity,
    // buildTrendBuckets accepts AreaDataset; InventoryDataset extends it directly.
    points: buildTrendBuckets(dataset),
  },
  // Pre-computed warehouse groups are embedded in the cached dataset.
  topPartners: dataset.warehouseGroups,
  exceptions: buildInventoryExceptions(dataset),
  quickLinks: buildQuickLinks(INVENTORY_MODULES),
});
