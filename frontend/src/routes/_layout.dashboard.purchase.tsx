import { createFileRoute } from "@tanstack/react-router";

import { PurchaseDashboard } from "@/features/dashboard/components/PurchaseDashboard";

export const Route = createFileRoute("/_layout/dashboard/purchase")({
  component: PurchaseDashboardRouteComponent,
});

function PurchaseDashboardRouteComponent() {
  return <PurchaseDashboard />;
}
