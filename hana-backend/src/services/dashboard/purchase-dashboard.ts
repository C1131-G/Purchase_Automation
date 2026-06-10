import type {
  DashboardExceptionGroup,
  DashboardFunnelStep,
  DashboardMainOutput,
  DashboardMetric,
  DashboardPartnerGroup,
  DocumentModule,
} from "./dashboard.types";

import {
  calculateRatio,
  getOpenValue,
  isOpenDocument,
  sumOpenTotals,
  sumTotals,
} from "./dashboard.calculations";
import { MODULE_HREFS, MODULE_LABELS, PURCHASE_MODULES } from "./dashboard.constants";
import { getModuleDataset } from "./dashboard.data";
import { buildPartnerGroup } from "./dashboard.partners";
import { buildTrendBuckets } from "./dashboard.trend";
import type { AreaDataset } from "./dashboard.types";
import {
  buildExceptionGroup,
  buildMetric,
  buildModuleCard,
  buildQuickLinks,
  sortByDateDescending,
  sortByOpenValue,
} from "./dashboard.view";

const buildPurchaseSummary = (dataset: AreaDataset): DashboardMetric[] => {
  const purchaseOrder = getModuleDataset(dataset, "purchaseOrder");
  const grpo = getModuleDataset(dataset, "grpo");
  const apInvoice = getModuleDataset(dataset, "apInvoice");
  const apCreditNote = getModuleDataset(dataset, "apCreditNote");
  const outgoingPayment = getModuleDataset(dataset, "outgoingPayment");

  const poTotal = sumTotals(purchaseOrder.current);
  const grpoTotal = sumTotals(grpo.current);
  const apInvoiceTotal = sumTotals(apInvoice.current);
  const paymentTotal = sumTotals(outgoingPayment.current);

  return [
    buildMetric("po-total", "Total PO Value", poTotal, "currency"),
    buildMetric("po-open", "Open PO Value", sumOpenTotals(purchaseOrder.current), "currency"),
    buildMetric("grpo-total", "GRPO Value", grpoTotal, "currency"),
    buildMetric("ap-invoice-total", "AP Invoice Value", apInvoiceTotal, "currency"),
    buildMetric(
      "ap-credit-total",
      "AP Credit Memo Value",
      sumTotals(apCreditNote.current),
      "currency",
    ),
    buildMetric("payment-total", "Outgoing Payment Value", paymentTotal, "currency"),
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
  const modules: DocumentModule[] = ["purchaseOrder", "grpo", "apInvoice", "outgoingPayment"];

  return modules.map((moduleName, index) => {
    const module = getModuleDataset(dataset, moduleName);
    const previousModule =
      index > 0 ? getModuleDataset(dataset, modules[index - 1] ?? moduleName) : module;
    const previousTotal = sumTotals(previousModule.current);

    return {
      key: module.module,
      label: MODULE_LABELS[module.module],
      module: module.module,
      href: MODULE_HREFS[module.module],
      documentCount: module.current.length,
      totalValue: sumTotals(module.current),
      openCount: module.current.filter((doc) => isOpenDocument(doc)).length,
      openValue: sumOpenTotals(module.current),
      conversionPct: calculateRatio(sumTotals(module.current), previousTotal),
    };
  });
};

const buildPurchaseExceptions = (dataset: AreaDataset): DashboardExceptionGroup[] => {
  const purchaseOrder = getModuleDataset(dataset, "purchaseOrder");
  const grpo = getModuleDataset(dataset, "grpo");
  const apInvoice = getModuleDataset(dataset, "apInvoice");
  const apCreditNote = getModuleDataset(dataset, "apCreditNote");
  const openPurchase = purchaseOrder.current.filter((doc) => isOpenDocument(doc));
  const openGrpo = grpo.current.filter((doc) => isOpenDocument(doc));
  const unpaidInvoices = apInvoice.current.filter((doc) => getOpenValue(doc) > 0);

  return [
    buildExceptionGroup(
      "open-purchase-orders",
      "Open Purchase Orders",
      "purchaseOrder",
      sortByOpenValue(openPurchase),
    ),
    buildExceptionGroup(
      "grpo-awaiting-ap-invoice",
      "GRPO Done but AP Invoice Missing",
      "grpo",
      sortByOpenValue(openGrpo),
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
      sortByOpenValue([...openPurchase, ...openGrpo, ...unpaidInvoices]),
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
  buildPartnerGroup(getModuleDataset(dataset, "purchaseOrder"), "Top Vendors by PO Value"),
  buildPartnerGroup(getModuleDataset(dataset, "apInvoice"), "Top Vendors by AP Invoice Value"),
  buildPartnerGroup(getModuleDataset(dataset, "outgoingPayment"), "Top Vendors by Payment Value"),
  buildPartnerGroup(getModuleDataset(dataset, "apCreditNote"), "Memo Impact by Vendor"),
];

export const buildPurchaseMain = (dataset: AreaDataset): DashboardMainOutput => ({
  currency: dataset.currency,
  period: dataset.period,
  summary: buildPurchaseSummary(dataset),
  funnel: buildPurchaseFunnel(dataset),
  moduleCards: PURCHASE_MODULES.map((module) => buildModuleCard(getModuleDataset(dataset, module))),
  trend: {
    title: "Purchase Flow Trend",
    granularity: dataset.granularity,
    points: buildTrendBuckets(dataset),
  },
  topPartners: buildPurchaseTopPartners(dataset),
  exceptions: buildPurchaseExceptions(dataset),
  quickLinks: buildQuickLinks(PURCHASE_MODULES),
});
