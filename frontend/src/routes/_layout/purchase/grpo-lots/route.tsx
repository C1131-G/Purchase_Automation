import { createFileRoute, Outlet } from "@tanstack/react-router";

import { requireActiveSession } from "@/shared/auth/require-active-session";

export const Route = createFileRoute("/_layout/purchase/grpo-lots")({
  beforeLoad: async () => {
    await requireActiveSession();
  },
  component: Outlet,
});
