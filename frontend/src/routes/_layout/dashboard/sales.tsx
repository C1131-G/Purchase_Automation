import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Legacy sales analytics dashboard — redirected to unified Overview (P1).
 */
export const Route = createFileRoute("/_layout/dashboard/sales")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard" });
  },
});
