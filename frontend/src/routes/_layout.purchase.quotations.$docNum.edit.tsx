import { createFileRoute } from "@tanstack/react-router";

import { CreatePageRouteSkeleton } from "@/components/skeleton/create-page-route-skeleton";
import { PurchaseQuotationCreate } from "@/features/create-pages/purchase-quotation-create/components/purchase-quotation-create";
import { purchaseQuotationQueries } from "@/features/table-pages/purchase-quotations/api/purchase-quotation.queries";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { requireActiveSession } from "@/routes/_require-active-session";

export const Route = createFileRoute("/_layout/purchase/quotations/$docNum/edit")({
  beforeLoad: async () => {
    await requireActiveSession();
  },
  component: PurchaseQuotationEditPage,
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(purchaseQuotationQueries.detailByDocNum(params.docNum)),
  pendingComponent: CreatePageRouteSkeleton,
});

function PurchaseQuotationEditPage() {
  const { docNum } = Route.useParams();
  useDocumentTitle(`Edit Purchase Quotation #${docNum} | ERP Portal`);
  return <PurchaseQuotationCreate mode="edit" docNum={docNum} />;
}
