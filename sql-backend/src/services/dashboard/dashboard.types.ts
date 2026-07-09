// Dashboard types: Shared interfaces for all dashboard data shapes.
// Aligned with hana-backend + legacy DashboardData used by getDashboard.

export type DocumentModule =
  | "purchaseQuotation"
  | "purchaseOrder"
  | "grpo"
  | "apInvoice"
  | "apCreditNote"
  | "outgoingPayment"
  | "salesQuotation"
  | "salesOrder"
  | "arInvoice"
  | "arCreditNote"
  | "incomingPayment"
  | "itemMaster"
  | "goodsReceipt"
  | "goodsIssue"
  | "transferRequest"
  | "transfer";

export type DashboardPeriod = "week" | "month" | "year" | "all";

export type DashboardArea = "purchase" | "sales" | "inventory";

export type DashboardGranularity = "day" | "month";

export type RawDashboardDocument = {
  module: DocumentModule;
  docEntry: number;
  docNum: number;
  docDate: string;
  docDueDate: string;
  cardCode: string;
  cardName: string;
  docTotal: number;
  docCurrency: string;
  docStatus: string;
  paidToDate: number;
};

export type DateRange = {
  start: string | null;
  end: string | null;
};

export type PeriodWindow = {
  current: DateRange;
  previous: DateRange | null;
  granularity: DashboardGranularity;
};

export type ModuleDataset = {
  module: DocumentModule;
  current: RawDashboardDocument[];
  previous: RawDashboardDocument[];
};

export type AreaDataset = {
  currency: string;
  modules: ModuleDataset[];
  period: DashboardPeriod;
  granularity: DashboardGranularity;
};

export type PartnerAggregate = {
  code: string;
  name: string;
  totalValue: number;
  documentCount: number;
  openValue: number;
};

export type DashboardMetric = {
  key: string;
  label: string;
  value: number;
  format: "currency" | "number" | "percent";
};

export type DashboardFunnelStep = {
  key: string;
  label: string;
  module: string;
  href: string;
  documentCount: number;
  totalValue: number;
  openCount: number;
  openValue: number;
  conversionPct: number;
};

export type DashboardModuleCard = {
  key: string;
  label: string;
  module: string;
  href: string;
  documentCount: number;
  totalValue: number;
  openCount: number;
  openValue: number;
  trendPct: number;
};

export type DashboardTrendPoint = {
  bucket: string;
  label: string;
  series: Record<string, number>;
};

export type DashboardTrend = {
  title: string;
  granularity: "day" | "month";
  points: DashboardTrendPoint[];
};

export type DashboardPartnerEntry = {
  code: string;
  name: string;
  totalValue: number;
  documentCount: number;
  openValue: number;
};

export type DashboardPartnerGroup = {
  key: string;
  title: string;
  module: string;
  href: string;
  entries: DashboardPartnerEntry[];
};

export type DashboardExceptionItem = {
  module: string;
  docNum: number;
  cardCode?: string;
  cardName?: string;
  docDate: string;
  docStatus?: string;
  docTotal: number;
  openValue: number;
  href: string;
};

export type DashboardExceptionGroup = {
  key: string;
  title: string;
  module: string;
  items: DashboardExceptionItem[];
};

export type DashboardQuickLink = {
  label: string;
  href: string;
  module: string;
  description: string;
};

export type DashboardMainOutput = {
  currency: string;
  period: DashboardPeriod;
  summary: DashboardMetric[];
  funnel: DashboardFunnelStep[];
  moduleCards: DashboardModuleCard[];
  trend: DashboardTrend;
  topPartners: DashboardPartnerGroup[];
  exceptions: DashboardExceptionGroup[];
  quickLinks: DashboardQuickLink[];
};

export type InventoryItemStats = {
  totalItems: number;
  onHandItems: number;
  stockValue: number;
  onOrderValue: number;
};

/** Extends AreaDataset so shared helpers accept inventory datasets without casts. */
export type InventoryDataset = AreaDataset & {
  itemStats: InventoryItemStats;
  warehouseGroups: DashboardPartnerGroup[];
};

// ─── Legacy compatibility types (getDashboard / summary endpoints) ───────────

export interface DashboardSummary {
  totalPOs: number;
  totalPOValue: number;
  totalGRPOs: number;
  totalGRPOValue: number;
  totalAPInvoices: number;
  totalAPValue: number;
  totalSalesOrders: number;
  totalSalesValue: number;
}

export interface LegacyDashboardTrend {
  periodLabel: string;
  value: number;
  previousValue: number;
  change: number;
}

export interface DashboardPartnerSummary {
  code: string;
  name: string;
  docCount: number;
  totalValue: number;
}

export interface InventorySummary {
  totalItems: number;
  totalStock: number;
  lowStockItems: number;
}

export interface DashboardData {
  summary: DashboardSummary;
  salesTrend: LegacyDashboardTrend[];
  purchaseTrend: LegacyDashboardTrend[];
  topVendors: DashboardPartnerSummary[];
  topCustomers: DashboardPartnerSummary[];
  inventory: InventorySummary;
}
