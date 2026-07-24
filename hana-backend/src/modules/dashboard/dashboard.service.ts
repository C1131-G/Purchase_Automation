import { timedDashboardSection } from "@/core/observability/dashboard";
import { getOverviewDashboard as getOverviewDashboardRaw } from "./dashboard.queries";

type AnyFn = (...args: never[]) => Promise<unknown> | unknown;

function instrumentSection<T extends AnyFn>(section: string, run: T): T {
  return ((...args: Parameters<T>) =>
    timedDashboardSection(section, () => run(...args) as ReturnType<T>)) as T;
}

export const getOverviewDashboard = instrumentSection("overview", getOverviewDashboardRaw);

export const dashboardService = {
  getOverviewDashboard,
};
