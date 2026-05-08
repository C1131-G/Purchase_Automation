import { createFileRoute } from "@tanstack/react-router";

import { CreatePageRouteSkeleton } from "@/components/skeleton/create-page-route-skeleton";
import { SalesQuotationCreate } from "@/features/create-pages/sales-quotation-create/components/sales-quotation-create";
import { requireActiveSession } from "@/routes/_require-active-session";

/**
 * SalesQuotationCreateRoute: Transactional page for drafting new sales orders.
 * SECURITY: Requires an active backend session before rendering the form.
 */
export const Route = createFileRoute("/_layout/sales/create-quotation")({
  beforeLoad: async () => {
    await requireActiveSession();
  },
  component: SalesQuotationCreate,
  pendingComponent: CreatePageRouteSkeleton,
  pendingMs: 0,
});
