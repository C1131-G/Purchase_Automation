import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Legacy purchase analytics dashboard — redirected to unified Overview (P1).
 */
export const Route = createFileRoute("/_layout/dashboard/purchase")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard" });
  },
});
