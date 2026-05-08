import { createFileRoute } from "@tanstack/react-router";

import { CreatePageRouteSkeleton } from "@/components/skeleton/create-page-route-skeleton";
import { SalesOrderCreate } from "@/features/create-pages/sales-order-create/components/sales-order-create";
import { requireActiveSession } from "@/routes/_require-active-session";

/**
 * SalesOrderCreateRoute: Transactional page for drafting new sales orders.
 * SECURITY: Requires an active backend session before rendering the form.
 */
export const Route = createFileRoute("/_layout/sales/create-order")({
  beforeLoad: async () => {
    await requireActiveSession();
  },
  component: SalesOrderCreate,
  pendingComponent: CreatePageRouteSkeleton,
  pendingMs: 0,
});
