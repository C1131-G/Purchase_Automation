import { createFileRoute } from "@tanstack/react-router";

import { SalesDashboard } from "@/features/dashboard/components/SalesDashboard";

export const Route = createFileRoute("/_layout/dashboard/sales")({
  component: SalesDashboardRouteComponent,
});

function SalesDashboardRouteComponent() {
  return <SalesDashboard />;
}
