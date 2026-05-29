import { createFileRoute } from "@tanstack/react-router";

import { CreatePageRouteSkeleton } from "@/components/skeleton/create-page-route-skeleton";
import { requireActiveSession } from "@/routes/_require-active-session";

function PurchaseQuotationCreatePage() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-gray-900">Create Purchase Quotation</h1>
        <p className="mt-4 text-sm text-gray-500">Purchase quotation creation form coming soon.</p>
      </div>
    </div>
  );
}

/**
 * PurchaseQuotationCreateRoute: Transactional page for drafting new purchase quotations.
 * SECURITY: Requires an active backend session before rendering the form.
 */
export const Route = createFileRoute("/_layout/purchase/create-quotation")({
  beforeLoad: async () => {
    await requireActiveSession();
  },
  component: PurchaseQuotationCreatePage,
  pendingComponent: CreatePageRouteSkeleton,
  pendingMs: 0,
});
