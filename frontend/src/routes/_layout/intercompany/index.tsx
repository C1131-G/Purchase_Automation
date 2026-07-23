import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * `/intercompany` → notifications list (P8A default surface).
 */
export const Route = createFileRoute("/_layout/intercompany/")({
  beforeLoad: () => {
    throw redirect({
      to: "/intercompany/notifications",
      search: {
        isRead: "all",
        limit: 10,
        page: 1,
      },
    });
  },
});
