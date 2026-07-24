import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Legacy sales analytics URL — permanent redirect to unified Overview (P5).
 */
export const Route = createFileRoute("/_layout/dashboard/sales")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard" });
  },
});
