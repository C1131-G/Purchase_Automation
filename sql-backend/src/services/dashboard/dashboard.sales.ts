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
  const sq = getModuleDataset(dataset, "salesQuotation");
  const so = getModuleDataset(dataset, "salesOrder");
  const ar = getModuleDataset(dataset, "arInvoice");
  const acn = getModuleDataset(dataset, "arCreditNote");
  const ip = getModuleDataset(dataset, "incomingPayment");
  const qTotal = sumTotals(sq.current);
  const sTotal = sumTotals(so.current);
  const arTotal = sumTotals(ar.current);
  const pTotal = sumTotals(ip.current);
  const cTotal = sumTotals(acn.current);
  return [
    buildMetric("quotation-total", "Sales Quotation Value", qTotal, "currency"),
    buildMetric("sales-total", "Total Sales Order Value", sTotal, "currency"),
    buildMetric("sales-open", "Open Sales Order Value", sumOpenTotals(so.current), "currency"),
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
  return modules.map((mn, idx) => {
    const mod = getModuleDataset(dataset, mn);
    const prev = idx > 0 ? getModuleDataset(dataset, modules[idx - 1] ?? mn) : mod;
    return {
      conversionPct: calculateRatio(sumTotals(mod.current), sumTotals(prev.current)),
      documentCount: mod.current.length,
      href: MODULE_HREFS[mod.module],
      key: mod.module,
      label: MODULE_LABELS[mod.module],
      module: mod.module,
      openCount: mod.current.filter((d) => isOpenDocument(d)).length,
      openValue: sumOpenTotals(mod.current),
      totalValue: sumTotals(mod.current),
    };
  });
};

const buildSalesExceptions = (dataset: AreaDataset): DashboardExceptionGroup[] => {
  const sq = getModuleDataset(dataset, "salesQuotation");
  const so = getModuleDataset(dataset, "salesOrder");
  const ar = getModuleDataset(dataset, "arInvoice");
  const acn = getModuleDataset(dataset, "arCreditNote");
  const oq = sq.current.filter((d) => isOpenDocument(d));
  const oso = so.current.filter((d) => isOpenDocument(d));
  const ui = ar.current.filter((d) => getOpenValue(d) > 0);
  return [
    buildExceptionGroup(
      "open-sales-quotations",
      "Open Sales Quotations Awaiting Conversion",
      "salesQuotation",
      sortByOpenValue(oq),
    ),
    buildExceptionGroup(
      "open-sales-orders",
      "Open Sales Orders Not Yet Invoiced",
      "salesOrder",
      sortByOpenValue(oso),
    ),
    buildExceptionGroup(
      "ar-invoice-awaiting-collection",
      "AR Invoices Raised but Collection Missing",
      "arInvoice",
      sortByOpenValue(ui),
    ),
    buildExceptionGroup(
      "recent-credit-notes",
      "Recent Memos",
      "arCreditNote",
      sortByDateDescending(acn.current),
    ),
    buildExceptionGroup(
      "largest-open-sales",
      "Largest Open-Value Sales Documents",
      "salesQuotation",
      sortByOpenValue([...oq, ...oso, ...ui]),
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
  moduleCards: SALES_MODULES.map((m) => buildModuleCard(getModuleDataset(dataset, m))),
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
