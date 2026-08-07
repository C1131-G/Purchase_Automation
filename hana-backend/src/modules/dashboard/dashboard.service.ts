import { timedDashboardSection } from "@/core/observability/dashboard";
import { loadArInvoiceDraftsPage } from "./dashboard.ar-approval.queries";
import {
  getOverviewDashboard as getOverviewDashboardRaw,
  warmOverviewDashboard as warmOverviewDashboardRaw,
} from "./dashboard.queries";

type AnyFn = (...args: never[]) => Promise<unknown> | unknown;

function instrumentSection<T extends AnyFn>(section: string, run: T): T {
  return ((...args: Parameters<T>) =>
    timedDashboardSection(section, () => run(...args) as ReturnType<T>)) as T;
}

export const getOverviewDashboard = instrumentSection("overview", getOverviewDashboardRaw);

export const warmOverviewDashboard = warmOverviewDashboardRaw;

export const getArInvoiceDraftsPage = instrumentSection(
  "ar-invoice-drafts",
  async (dbName: string, params: { offset?: number; limit?: number }) =>
    loadArInvoiceDraftsPage(dbName, params),
);

export const dashboardService = {
  getOverviewDashboard,
  warmOverviewDashboard,
  getArInvoiceDraftsPage,
};
