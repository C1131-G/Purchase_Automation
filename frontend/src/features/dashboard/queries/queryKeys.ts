import type { DashboardPeriod, DashboardArea } from "../utils/types";

export const dashboardKeys = {
  all: ["dashboard"] as const,
  overview: () => [...dashboardKeys.all, "overview"] as const,
  area: (area: DashboardArea) => [...dashboardKeys.all, area] as const,
  period: (area: DashboardArea, period: DashboardPeriod) =>
    [...dashboardKeys.area(area), period] as const,
  segment: (area: DashboardArea, period: DashboardPeriod, segment: string) =>
    [...dashboardKeys.period(area, period), segment] as const,
};
