import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

import { RoutePendingFallback } from "@/features/layout/components/route-pending-fallback";
import { useDocumentTitle } from "@/hooks/use-document-title";

const OverviewDashboard = lazy(() =>
  import("@/features/dashboard/components/overview/OverviewDashboard").then((m) => ({
    default: m.OverviewDashboard,
  })),
);

function DashboardPending() {
  return <RoutePendingFallback pathname="/dashboard" />;
}

export const Route = createFileRoute("/_layout/dashboard/")({
  pendingComponent: DashboardPending,
  component: OverviewDashboardRoute,
});

function OverviewDashboardRoute() {
  useDocumentTitle("Overview | ERP Portal");
  return (
    <Suspense fallback={<DashboardPending />}>
      <OverviewDashboard />
    </Suspense>
  );
}
