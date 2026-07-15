// Sales dashboard builder — matching hana exactly.

import {
  calculateRatio,
  getOpenValue,
  isOpenDocument,
  sumOpenTotals,
  sumTotals,
} from "./dashboard-calculations.util";
import { MODULE_HREFS, MODULE_LABELS, SALES_MODULES } from "./dashboard-constants.util";
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

const buildSalesSummary = (dataset: AreaDataset): DashboardMetric[] => {
  const salesQuotation = getModuleDataset(dataset, "salesQuotation");
  const salesOrder = getModuleDataset(dataset, "salesOrder");
  const arInvoice = getModuleDataset(dataset, "arInvoice");
  const arCreditNote = getModuleDataset(dataset, "arCreditNote");
  const incomingPayment = getModuleDataset(dataset, "incomingPayment");
  const qTotal = sumTotals(salesQuotation.current);
  const sTotal = sumTotals(salesOrder.current);
  const arTotal = sumTotals(arInvoice.current);
  const pTotal = sumTotals(incomingPayment.current);
  const cTotal = sumTotals(arCreditNote.current);
  return [
    buildMetric("quotation-total", "Sales Quotation Value", qTotal, "currency"),
    buildMetric("sales-total", "Total Sales Order Value", sTotal, "currency"),
    buildMetric("sales-open", "Open Sales Order Value", sumOpenTotals(salesOrder.current), "currency"),
    buildMetric("ar-invoice-total", "AR Invoice Value", arTotal, "currency"),
    buildMetric("ar-credit-total", "AR Credit Memo Value", cTotal, "currency"),
    buildMetric("payment-total", "Incoming Payment Value", pTotal, "currency"),
    buildMetric("net-sales", "Net Sales", arTotal - cTotal, "currency"),
    buildMetric(
      "quote-so-conversion",
      "Quotation to SO Conversion",
      calculateRatio(sTotal, qTotal),
      "percent",
    ),
    buildMetric(
      "so-ar-conversion",
      "SO to AR Invoice Conversion",
      calculateRatio(arTotal, sTotal),
      "percent",
    ),
    buildMetric(
      "ar-collection-coverage",
      "AR Invoice to Collection Coverage",
      calculateRatio(pTotal, arTotal),
      "percent",
    ),
  ];
};

const buildSalesFunnel = (dataset: AreaDataset): DashboardFunnelStep[] => {
  const modules: DocumentModule[] = [
    "salesQuotation",
    "salesOrder",
    "arInvoice",
    "incomingPayment",
  ];
  return modules.map((moduleName, idx) => {
    const mod = getModuleDataset(dataset, moduleName);
    const prev = idx > 0 ? getModuleDataset(dataset, modules[idx - 1] ?? moduleName) : mod;
    return {
      conversionPct: calculateRatio(sumTotals(mod.current), sumTotals(prev.current)),
      documentCount: mod.current.length,
      href: MODULE_HREFS[mod.module],
      key: mod.module,
      label: MODULE_LABELS[mod.module],
      module: mod.module,
      openCount: mod.current.filter((document) => isOpenDocument(document)).length,
      openValue: sumOpenTotals(mod.current),
      totalValue: sumTotals(mod.current),
    };
  });
};

const buildSalesExceptions = (dataset: AreaDataset): DashboardExceptionGroup[] => {
  const salesQuotation = getModuleDataset(dataset, "salesQuotation");
  const salesOrder = getModuleDataset(dataset, "salesOrder");
  const arInvoice = getModuleDataset(dataset, "arInvoice");
  const arCreditNote = getModuleDataset(dataset, "arCreditNote");
  const openQuotations = salesQuotation.current.filter((document) => isOpenDocument(document));
  const openSalesOrders = salesOrder.current.filter((document) => isOpenDocument(document));
  const unpaidInvoices = arInvoice.current.filter((document) => getOpenValue(document) > 0);
  return [
    buildExceptionGroup(
      "open-sales-quotations",
      "Open Sales Quotations Awaiting Conversion",
      "salesQuotation",
      sortByOpenValue(openQuotations),
    ),
    buildExceptionGroup(
      "open-sales-orders",
      "Open Sales Orders Not Yet Invoiced",
      "salesOrder",
      sortByOpenValue(openSalesOrders),
    ),
    buildExceptionGroup(
      "ar-invoice-awaiting-collection",
      "AR Invoices Raised but Collection Missing",
      "arInvoice",
      sortByOpenValue(unpaidInvoices),
    ),
    buildExceptionGroup(
      "recent-credit-notes",
      "Recent Memos",
      "arCreditNote",
      sortByDateDescending(arCreditNote.current),
    ),
    buildExceptionGroup(
      "largest-open-sales",
      "Largest Open-Value Sales Documents",
      "salesQuotation",
      sortByOpenValue([...openQuotations, ...openSalesOrders, ...unpaidInvoices]),
    ),
  ];
};

const buildSalesTopPartners = (dataset: AreaDataset): DashboardPartnerGroup[] => [
  buildPartnerGroup(
    getModuleDataset(dataset, "salesQuotation"),
    "Top Customers by Sales Quotation Value",
  ),
  buildPartnerGroup(getModuleDataset(dataset, "salesOrder"), "Top Customers by Sales Order Value"),
  buildPartnerGroup(getModuleDataset(dataset, "arInvoice"), "Top Customers by AR Invoice Value"),
  buildPartnerGroup(
    getModuleDataset(dataset, "incomingPayment"),
    "Top Customers by Collection Value",
  ),
];

export const buildSalesMain = (dataset: AreaDataset): DashboardMainOutput => ({
  currency: dataset.currency,
  exceptions: buildSalesExceptions(dataset),
  funnel: buildSalesFunnel(dataset),
  moduleCards: SALES_MODULES.map((moduleKey) => buildModuleCard(getModuleDataset(dataset, moduleKey))),
  period: dataset.period,
  quickLinks: buildQuickLinks(SALES_MODULES),
  summary: buildSalesSummary(dataset),
  topPartners: buildSalesTopPartners(dataset),
  trend: {
    granularity: dataset.granularity,
    points: buildTrendBuckets(dataset),
    title: "Sales Flow Trend",
  },
});
