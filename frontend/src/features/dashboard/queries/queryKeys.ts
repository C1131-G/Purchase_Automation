export const dashboardKeys = {
  all: ["dashboard"] as const,
  overview: () => [...dashboardKeys.all, "overview"] as const,
  overviewWork: () => [...dashboardKeys.overview(), "work"] as const,
  overviewRelationships: () => [...dashboardKeys.overview(), "relationships"] as const,
  arInvoiceDrafts: () => [...dashboardKeys.all, "ar-invoice-drafts"] as const,
};
