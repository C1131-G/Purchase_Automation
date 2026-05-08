import { createFileRoute } from "@tanstack/react-router";

import { CreatePageRouteSkeleton } from "@/components/skeleton/create-page-route-skeleton";
import { PurchaseOrderCreate } from "@/features/create-pages/purchase-order-create/components/purchase-order-create";
import { requireActiveSession } from "@/routes/_require-active-session";

/**
 * PurchaseOrderCreateRoute: Transactional page for drafting new procurement orders.
 * SECURITY: Requires an active backend session before rendering the form.
 */
export const Route = createFileRoute("/_layout/purchase/create-order")({
  beforeLoad: async () => {
    await requireActiveSession();
  },
  component: PurchaseOrderCreate,
  pendingComponent: CreatePageRouteSkeleton,
  pendingMs: 0,
});
