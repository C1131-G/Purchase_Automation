import { createFileRoute } from "@tanstack/react-router";

import { CreatePageRouteSkeleton } from "@/components/skeleton/create-page-route-skeleton";
import { PurchaseQuotationCreate } from "@/features/create-pages/purchase-quotation-create/components/purchase-quotation-create";
import { requireActiveSession } from "@/routes/_require-active-session";

/**
 * PurchaseQuotationCreateRoute: Transactional page for drafting new purchase quotations.
 * SECURITY: Requires an active backend session before rendering the form.
 */
export const Route = createFileRoute("/_layout/purchase/create-quotation")({
  beforeLoad: async () => {
    await requireActiveSession();
  },
  component: PurchaseQuotationCreate,
  pendingComponent: CreatePageRouteSkeleton,
  pendingMs: 0,
});

