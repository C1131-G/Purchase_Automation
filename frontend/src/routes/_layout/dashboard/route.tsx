import { createFileRoute, Outlet } from "@tanstack/react-router";

/**
 * Dashboard layout shell. Index route renders Overview; legacy purchase/sales redirect there.
 */
export const Route = createFileRoute("/_layout/dashboard")({
  component: DashboardLayoutComponent,
});

function DashboardLayoutComponent() {
  return <Outlet />;
}
