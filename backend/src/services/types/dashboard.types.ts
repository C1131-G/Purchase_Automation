/**
 * Dashboard Service Types
 */

export interface DashboardStats {
  openInvoices: number;
  overdueInvoices: number;
  totalReceivable: number;
  paidLast30Days: number;
  recentTransactions: Array<{
    id: number;
    type: string;
    date: Date;
    total: number;
    status: string;
  }>;
}

export interface DashboardChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
  }>;
}
