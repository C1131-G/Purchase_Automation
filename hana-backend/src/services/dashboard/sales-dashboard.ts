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
import { MODULE_HREFS, MODULE_LABELS, SALES_MODULES } from "./dashboard.constants";
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

const buildSalesSummary = (dataset: AreaDataset): DashboardMetric[] => {
  const salesQuotation = getModuleDataset(dataset, "salesQuotation");
  const salesOrder = getModuleDataset(dataset, "salesOrder");
  const arInvoice = getModuleDataset(dataset, "arInvoice");
  const arCreditNote = getModuleDataset(dataset, "arCreditNote");
  const incomingPayment = getModuleDataset(dataset, "incomingPayment");

  const quotationTotal = sumTotals(salesQuotation.current);
  const salesTotal = sumTotals(salesOrder.current);
  const arInvoiceTotal = sumTotals(arInvoice.current);
  const paymentTotal = sumTotals(incomingPayment.current);
  const creditTotal = sumTotals(arCreditNote.current);

  return [
    buildMetric("quotation-total", "Sales Quotation Value", quotationTotal, "currency"),
    buildMetric("sales-total", "Total Sales Order Value", salesTotal, "currency"),
    buildMetric(
      "sales-open",
      "Open Sales Order Value",
      sumOpenTotals(salesOrder.current),
      "currency",
    ),
    buildMetric("ar-invoice-total", "AR Invoice Value", arInvoiceTotal, "currency"),
    buildMetric("ar-credit-total", "AR Credit Memo Value", creditTotal, "currency"),
    buildMetric("payment-total", "Incoming Payment Value", paymentTotal, "currency"),
    buildMetric("net-sales", "Net Sales", arInvoiceTotal - creditTotal, "currency"),
    buildMetric(
      "quote-so-conversion",
      "Quotation to Sales Order Conversion",
      calculateRatio(salesTotal, quotationTotal),
      "percent",
    ),
    buildMetric(
      "so-ar-conversion",
      "Sales Order to AR Invoice Conversion",
      calculateRatio(arInvoiceTotal, salesTotal),
      "percent",
    ),
    buildMetric(
      "ar-collection-coverage",
      "AR Invoice to Collection Coverage",
      calculateRatio(paymentTotal, arInvoiceTotal),
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

const buildSalesExceptions = (dataset: AreaDataset): DashboardExceptionGroup[] => {
  const salesQuotation = getModuleDataset(dataset, "salesQuotation");
  const salesOrder = getModuleDataset(dataset, "salesOrder");
  const arInvoice = getModuleDataset(dataset, "arInvoice");
  const arCreditNote = getModuleDataset(dataset, "arCreditNote");
  const openQuotations = salesQuotation.current.filter((doc) => isOpenDocument(doc));
  const openSalesOrders = salesOrder.current.filter((doc) => isOpenDocument(doc));
  const uncollectedInvoices = arInvoice.current.filter((doc) => getOpenValue(doc) > 0);

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
      sortByOpenValue(uncollectedInvoices),
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
      sortByOpenValue([...openQuotations, ...openSalesOrders, ...uncollectedInvoices]),
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
  period: dataset.period,
  summary: buildSalesSummary(dataset),
  funnel: buildSalesFunnel(dataset),
  moduleCards: SALES_MODULES.map((module) => buildModuleCard(getModuleDataset(dataset, module))),
  trend: {
    title: "Sales Flow Trend",
    granularity: dataset.granularity,
    points: buildTrendBuckets(dataset),
  },
  topPartners: buildSalesTopPartners(dataset),
  exceptions: buildSalesExceptions(dataset),
  quickLinks: buildQuickLinks(SALES_MODULES),
});
