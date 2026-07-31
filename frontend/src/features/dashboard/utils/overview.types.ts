export type OverviewKpiMetric = {
  count: number;
  openValue: number;
  href: string;
};

export type OverviewArKpi = {
  count: number;
  openValue: number;
};

/** One open AR invoice (OINV DocStatus=O) for the overview panel. */
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
  statement: OverviewStatement;
};

export type OverviewAging = {
  d0_30: number;
  d31_60: number;
  d61_90: number;
  d90_plus: number;
};

export type OverviewStatementPartner = {
  cardCode: string;
  cardName: string;
  /** SAP CardType: S = vendor, C = customer. */
  cardType: "S" | "C";
  balance: number;
  aging: OverviewAging;
  /** OCRD master currency when available. */
  currency?: string | null;
  /** OCRD.CreditLine when set on the partner. */
  creditLine?: number | null;
  /** OCRD.frozenFor = Y */
  isFrozen?: boolean;
};

export type OverviewStatement = {
  partners: OverviewStatementPartner[];
  totals: {
    balance: number;
    aging: OverviewAging;
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

export function emptyOverviewAging(): OverviewAging {
  return { d0_30: 0, d31_60: 0, d61_90: 0, d90_plus: 0 };
}

export function roleToCardType(role: "vendor" | "customer"): "S" | "C" {
  return role === "vendor" ? "S" : "C";
}

/** Resolve statement row for a single connected partner selection. */
export function findStatementPartner(
  partners: OverviewStatementPartner[],
  selection: Extract<OverviewPartnerSelection, { kind: "partner" }>,
): OverviewStatementPartner | null {
  const cardType = roleToCardType(selection.role);
  const code = selection.cardCode.trim();
  return (
    partners.find((row) => row.cardCode === code && row.cardType === cardType) ??
    partners.find((row) => row.cardCode === code) ??
    null
  );
}

export type ResolvedStatementView = {
  balance: number;
  aging: OverviewAging;
  selectedPartner: OverviewStatementPartner | null;
  showEmptyPartner: boolean;
};

/** Client-side filter: all-connected totals vs one partner (P2/P4). */
export function resolveStatementView(
  selection: OverviewPartnerSelection,
  statement: OverviewStatement,
  partnerCount: number,
): ResolvedStatementView {
  if (selection.kind === "all") {
    return {
      balance: statement.totals.balance,
      aging: statement.totals.aging,
      selectedPartner: null,
      showEmptyPartner: false,
    };
  }

  const selectedPartner = findStatementPartner(statement.partners, selection);
  return {
    balance: selectedPartner?.balance ?? 0,
    aging: selectedPartner?.aging ?? emptyOverviewAging(),
    selectedPartner,
    showEmptyPartner: selectedPartner === null && partnerCount > 0,
  };
}
