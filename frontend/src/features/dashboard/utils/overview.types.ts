export type OverviewKpiMetric = {
  count: number;
  openValue: number;
  href: string;
};

export type OverviewArKpi = {
  count: number;
  openValue: number;
};

/** One AR invoice awaiting SAP approval (OWDD ObjType 13). */
export type OverviewArApprovalItem = {
  docEntry: number;
  docNum: number | null;
  isDraft: boolean;
  cardCode: string;
  cardName: string;
  docTotal: number;
  docDate: string | null;
  wddCode: number;
  status: string;
  ageDays: number;
  requester: string | null;
};

export type OverviewConnectedPartner = {
  mappingId: number;
  buyerCompanyId: number;
  buyerCompanyName: string | null;
  vendorCompanyId: number;
  vendorCompanyName: string | null;
  vendorCode: string;
  vendorName: string | null;
  buyerCustomerCode: string;
  customerName: string | null;
  /** How this link appears in the session company books. */
  role: "vendor" | "customer";
  /** CardCode in the session company OCRD (vendor or customer). */
  cardCode: string;
  cardName: string | null;
  partnerCompanyId: number;
  partnerCompanyName: string | null;
};

export type OverviewDashboard = {
  currency: string;
  asOf: string;
  sessionCompanyId: number | null;
  kpis: {
    openPq: OverviewKpiMetric;
    openSq: OverviewKpiMetric;
    openPo: OverviewKpiMetric;
    arApprovalPending: OverviewArKpi;
  };
  connectedPartners: OverviewConnectedPartner[];
  arApprovalPending: OverviewArApprovalItem[];
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

/** Client selection key for statement filter shell (P2). */
export type OverviewPartnerSelection =
  | { kind: "all" }
  | {
      kind: "partner";
      mappingId: number;
      role: "vendor" | "customer";
      cardCode: string;
      cardName: string | null;
      partnerCompanyName: string | null;
    };

export function partnerSelectionKey(partner: OverviewConnectedPartner): string {
  return `${partner.mappingId}:${partner.role}`;
}
