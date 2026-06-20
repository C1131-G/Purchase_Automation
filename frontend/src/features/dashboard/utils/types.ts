export type DashboardPeriod = "week" | "month" | "year" | "all";

export interface DashboardMetric {
  key: string;
  label: string;
  value: number;
  format: "currency" | "number" | "percent";
}

export interface DashboardFunnelStep {
  key: string;
  label: string;
  module: string;
  href: string;
  documentCount: number;
  totalValue: number;
  openCount: number;
  openValue: number;
  conversionPct: number;
}

export interface DashboardModuleCard {
  key: string;
  label: string;
  module: string;
  href: string;
  documentCount: number;
  totalValue: number;
  openCount: number;
  openValue: number;
  trendPct: number;
}

export interface DashboardTrendPoint {
  bucket: string;
  label: string;
  series: Record<string, number>;
}

export interface DashboardTrend {
  title: string;
  granularity: "day" | "month";
  points: DashboardTrendPoint[];
}

export interface DashboardPartnerEntry {
  code: string;
  name: string;
  totalValue: number;
  documentCount: number;
  openValue: number;
}

export interface DashboardPartnerGroup {
  key: string;
  title: string;
  module: string;
  href: string;
  entries: DashboardPartnerEntry[];
}

export interface DashboardExceptionItem {
  module: string;
  docNum: number;
  cardCode?: string;
  cardName?: string;
  docDate: string;
  docStatus?: string;
  docTotal: number;
  openValue: number;
  href: string;
}

export interface DashboardExceptionGroup {
  key: string;
  title: string;
  module: string;
  items: DashboardExceptionItem[];
}

export interface DashboardQuickLink {
  label: string;
  href: string;
  module: string;
  description: string;
}

export type DashboardArea = "purchase" | "sales" | "inventory";

export interface DashboardAreaConfig {
  area: DashboardArea;
  title: string;
  accentColor: "blue" | "indigo" | "emerald";
}

export function isDashboardPeriod(val: unknown): val is DashboardPeriod {
  return typeof val === "string" && ["week", "month", "year", "all"].includes(val);
}

export const DASHBOARD_CONFIG: Record<DashboardArea, DashboardAreaConfig> = {
  purchase: {
    area: "purchase",
    title: "Purchase Dashboard",
    accentColor: "blue",
  },
  sales: {
    area: "sales",
    title: "Sales Dashboard",
    accentColor: "indigo",
  },
  inventory: {
    area: "inventory",
    title: "Inventory Dashboard",
    accentColor: "blue",
  },
};
