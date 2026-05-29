import { createFileRoute } from "@tanstack/react-router";

import { CreatePageRouteSkeleton } from "@/components/skeleton/create-page-route-skeleton";
import { purchaseQuotationQueries } from "@/features/table-pages/purchase-quotations/api/purchase-quotation.queries";
import { requireActiveSession } from "@/routes/_require-active-session";

function PurchaseQuotationEditPage() {
  const { docNum } = Route.useParams();
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-gray-900">Edit Purchase Quotation</h1>
        <p className="mt-2 text-gray-600">Document #{docNum}</p>
        <p className="mt-4 text-sm text-gray-500">Purchase quotation edit form coming soon.</p>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/_layout/purchase/quotations/$docNum/edit")({
  beforeLoad: async () => {
    await requireActiveSession();
  },
  component: PurchaseQuotationEditPage,
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(purchaseQuotationQueries.detailByDocNum(params.docNum)),
  pendingComponent: CreatePageRouteSkeleton,
});
