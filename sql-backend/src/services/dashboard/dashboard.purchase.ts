// Purchase dashboard builder — matching hana exactly.

import {
  calculateRatio,
  getOpenValue,
  isOpenDocument,
  sumOpenTotals,
  sumTotals,
} from "./dashboard-calculations.util";
import { MODULE_HREFS, MODULE_LABELS, PURCHASE_MODULES } from "./dashboard-constants.util";
import { getModuleDataset } from "./dashboard-data.util";
import { buildPartnerGroup } from "./dashboard-partners.util";
import { buildTrendBuckets } from "./dashboard-trend.util";
import {
  buildExceptionGroup,
  buildMetric,
  buildModuleCard,
  buildQuickLinks,
  sortByDateDescending,
  sortByOpenValue,
} from "./dashboard-view.util";
import type {
  DashboardExceptionGroup,
  DashboardFunnelStep,
  DashboardMainOutput,
  DashboardMetric,
  DashboardPartnerGroup,
  DocumentModule,
} from "./dashboard.types";
import type { AreaDataset } from "./dashboard.types";

const buildPurchaseSummary = (dataset: AreaDataset): DashboardMetric[] => {
  const purchaseQuotation = getModuleDataset(dataset, "purchaseQuotation");
  const purchaseOrder = getModuleDataset(dataset, "purchaseOrder");
  const goodsReceipt = getModuleDataset(dataset, "grpo");
  const apInvoice = getModuleDataset(dataset, "apInvoice");
  const apCreditNote = getModuleDataset(dataset, "apCreditNote");
  const outgoingPayment = getModuleDataset(dataset, "outgoingPayment");
  const pqTotal = sumTotals(purchaseQuotation.current);
  const poTotal = sumTotals(purchaseOrder.current);
  const grpoTotal = sumTotals(goodsReceipt.current);
  const apInvoiceTotal = sumTotals(apInvoice.current);
  const paymentTotal = sumTotals(outgoingPayment.current);
  return [
    buildMetric("pq-total", "Total PQ Value", pqTotal, "currency"),
    buildMetric("pq-open", "Open PQ Value", sumOpenTotals(purchaseQuotation.current), "currency"),
    buildMetric("po-total", "Total PO Value", poTotal, "currency"),
    buildMetric("po-open", "Open PO Value", sumOpenTotals(purchaseOrder.current), "currency"),
    buildMetric("grpo-total", "GRPO Value", grpoTotal, "currency"),
    buildMetric("ap-invoice-total", "AP Invoice Value", apInvoiceTotal, "currency"),
    buildMetric("ap-credit-total", "AP Credit Memo Value", sumTotals(apCreditNote.current), "currency"),
    buildMetric("payment-total", "Outgoing Payment Value", paymentTotal, "currency"),
    buildMetric(
      "pq-po-conversion",
      "PQ to PO Conversion",
      calculateRatio(poTotal, pqTotal),
      "percent",
    ),
    buildMetric(
      "po-grpo-conversion",
      "PO to GRPO Conversion",
      calculateRatio(grpoTotal, poTotal),
      "percent",
    ),
    buildMetric(
      "grpo-ap-conversion",
      "GRPO to AP Invoice Conversion",
      calculateRatio(apInvoiceTotal, grpoTotal),
      "percent",
    ),
    buildMetric(
      "ap-payment-coverage",
      "AP Invoice to Payment Coverage",
      calculateRatio(paymentTotal, apInvoiceTotal),
      "percent",
    ),
  ];
};

const buildPurchaseFunnel = (dataset: AreaDataset): DashboardFunnelStep[] => {
  const modules: DocumentModule[] = [
    "purchaseQuotation",
    "purchaseOrder",
    "grpo",
    "apInvoice",
    "outgoingPayment",
  ];
  return modules.map((moduleName, index) => {
    const module = getModuleDataset(dataset, moduleName);
    const prev = index > 0 ? getModuleDataset(dataset, modules[index - 1] ?? moduleName) : module;
    return {
      conversionPct: calculateRatio(sumTotals(module.current), sumTotals(prev.current)),
      documentCount: module.current.length,
      href: MODULE_HREFS[module.module],
      key: module.module,
      label: MODULE_LABELS[module.module],
      module: module.module,
      openCount: module.current.filter((document) => isOpenDocument(document)).length,
      openValue: sumOpenTotals(module.current),
      totalValue: sumTotals(module.current),
    };
  });
};

const buildPurchaseExceptions = (dataset: AreaDataset): DashboardExceptionGroup[] => {
  const purchaseQuotation = getModuleDataset(dataset, "purchaseQuotation");
  const purchaseOrder = getModuleDataset(dataset, "purchaseOrder");
  const goodsReceipt = getModuleDataset(dataset, "grpo");
  const apInvoice = getModuleDataset(dataset, "apInvoice");
  const apCreditNote = getModuleDataset(dataset, "apCreditNote");
  const openQuotations = purchaseQuotation.current.filter((document) => isOpenDocument(document));
  const openPurchaseOrders = purchaseOrder.current.filter((document) => isOpenDocument(document));
  const openGoodsReceipt = goodsReceipt.current.filter((document) => isOpenDocument(document));
  const unpaidInvoices = apInvoice.current.filter((document) => getOpenValue(document) > 0);
  return [
    buildExceptionGroup(
      "open-purchase-quotations",
      "Open Purchase Quotations",
      "purchaseQuotation",
      sortByOpenValue(openQuotations),
    ),
    buildExceptionGroup(
      "open-purchase-orders",
      "Open Purchase Orders",
      "purchaseOrder",
      sortByOpenValue(openPurchaseOrders),
    ),
    buildExceptionGroup(
      "grpo-awaiting-ap-invoice",
      "GRPO Done but AP Invoice Missing",
      "grpo",
      sortByOpenValue(openGoodsReceipt),
    ),
    buildExceptionGroup(
      "ap-invoice-awaiting-payment",
      "AP Invoices Raised but Payment Missing",
      "apInvoice",
      sortByOpenValue(unpaidInvoices),
    ),
    buildExceptionGroup(
      "largest-open-value",
      "Largest Open-Value Documents",
      "purchaseOrder",
      sortByOpenValue([
        ...openQuotations,
        ...openPurchaseOrders,
        ...openGoodsReceipt,
        ...unpaidInvoices,
      ]),
    ),
    buildExceptionGroup(
      "recent-credit-notes",
      "Recent Memos",
      "apCreditNote",
      sortByDateDescending(apCreditNote.current),
    ),
  ];
};

const buildPurchaseTopPartners = (dataset: AreaDataset): DashboardPartnerGroup[] => [
  buildPartnerGroup(getModuleDataset(dataset, "purchaseQuotation"), "Top Vendors by PQ Value"),
  buildPartnerGroup(getModuleDataset(dataset, "purchaseOrder"), "Top Vendors by PO Value"),
  buildPartnerGroup(getModuleDataset(dataset, "apInvoice"), "Top Vendors by AP Invoice Value"),
  buildPartnerGroup(getModuleDataset(dataset, "outgoingPayment"), "Top Vendors by Payment Value"),
  buildPartnerGroup(getModuleDataset(dataset, "apCreditNote"), "Memo Impact by Vendor"),
];

export const buildPurchaseMain = (dataset: AreaDataset): DashboardMainOutput => ({
  currency: dataset.currency,
  exceptions: buildPurchaseExceptions(dataset),
  funnel: buildPurchaseFunnel(dataset),
  moduleCards: PURCHASE_MODULES.map((moduleKey) => buildModuleCard(getModuleDataset(dataset, moduleKey))),
  period: dataset.period,
  quickLinks: buildQuickLinks(PURCHASE_MODULES),
  summary: buildPurchaseSummary(dataset),
  topPartners: buildPurchaseTopPartners(dataset),
  trend: {
    granularity: dataset.granularity,
    points: buildTrendBuckets(dataset),
    title: "Purchase Flow Trend",
  },
});
