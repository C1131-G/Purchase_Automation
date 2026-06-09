import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_layout/dashboard")({
  component: DashboardLayoutComponent,
});

function DashboardLayoutComponent() {
  return <Outlet />;
}
