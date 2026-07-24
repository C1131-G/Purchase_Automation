import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Legacy purchase analytics URL — permanent redirect to unified Overview (P5).
 */
export const Route = createFileRoute("/_layout/dashboard/purchase")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard" });
  },
});
