export type OverviewKpiMetric = {
  count: number;
  openValue: number;
  href: string;
};

export type OverviewArKpi = {
  count: number;
  openValue: number;
};

export type OverviewDashboard = {
  currency: string;
  asOf: string;
  kpis: {
    openPq: OverviewKpiMetric;
    openSq: OverviewKpiMetric;
    openPo: OverviewKpiMetric;
    arApprovalPending: OverviewArKpi;
  };
  connectedPartners: unknown[];
  arApprovalPending: unknown[];
  statement: {
    partners: unknown[];
    totals: {
      balance: number;
      aging: {
        d0_30: number;
        d31_60: number;
        d61_90: number;
        d90_plus: number;
      };
    };
  };
};

export type OverviewDashboardResponse = {
  success: boolean;
  data: OverviewDashboard;
};
