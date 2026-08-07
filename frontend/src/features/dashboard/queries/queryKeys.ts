export const dashboardKeys = {
  all: ["dashboard"] as const,
  overview: () => [...dashboardKeys.all, "overview"] as const,
  arInvoiceDrafts: () => [...dashboardKeys.all, "ar-invoice-drafts"] as const,
};
