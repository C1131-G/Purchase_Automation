import { createFileRoute, Outlet } from "@tanstack/react-router";
import React from "react";

import { useSetSidebarAction } from "@/store/sidebar/sidebar.store";

export const Route = createFileRoute("/_layout/dashboard")({
  component: DashboardLayoutComponent,
});

function DashboardLayoutComponent() {
  const setSidebarOpen = useSetSidebarAction();

  React.useEffect(() => {
    // Keep sidebar open/available on dashboard entry
    setSidebarOpen(true);
  }, [setSidebarOpen]);

  return <Outlet />;
}
