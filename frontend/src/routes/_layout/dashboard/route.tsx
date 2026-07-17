import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

/**
 * Dashboard layout shell. /dashboard alone has no child content — redirect to purchase.
 */
export const Route = createFileRoute("/_layout/dashboard")({
  beforeLoad: ({ location }) => {
    const path = location.pathname.replace(/\/$/, "") || "/";
    if (path === "/dashboard") {
      throw redirect({
        to: "/dashboard/purchase",
        search: { period: "week" },
      });
    }
  },
  component: DashboardLayoutComponent,
});

function DashboardLayoutComponent() {
  return <Outlet />;
}
