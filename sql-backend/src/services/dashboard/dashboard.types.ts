// Dashboard types: Shared interfaces for all dashboard data shapes.

export interface DashboardPeriod {
  startDate: string;
  endDate: string;
  label: string;
}

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

export interface DashboardTrend {
  period: string;
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
  salesTrend: DashboardTrend[];
  purchaseTrend: DashboardTrend[];
  topVendors: DashboardPartnerSummary[];
  topCustomers: DashboardPartnerSummary[];
  inventory: InventorySummary;
}
