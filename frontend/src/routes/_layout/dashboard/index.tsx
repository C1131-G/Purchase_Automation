import { createFileRoute } from "@tanstack/react-router";

import { OverviewDashboard } from "@/features/dashboard/components/overview/OverviewDashboard";
import { useDocumentTitle } from "@/hooks/use-document-title";

export const Route = createFileRoute("/_layout/dashboard/")({
  component: OverviewDashboardRoute,
});

function OverviewDashboardRoute() {
  useDocumentTitle("Overview | ERP Portal");
  return <OverviewDashboard />;
}
