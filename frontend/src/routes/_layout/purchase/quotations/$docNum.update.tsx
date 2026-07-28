import { createFileRoute } from "@tanstack/react-router";

import { CreatePageRouteSkeleton } from "@/components/skeleton/create-page-route-skeleton";
import {
  createPageHighlightSearchSchema,
  toCreatePageHighlightProps,
} from "@/features/create-pages/create-shared/utils/create-page-highlight";
import { PurchaseQuotationCreate } from "@/features/create-pages/purchase-quotation-create/components/purchase-quotation-create";
import { purchaseQuotationQueries } from "@/features/table-pages/purchase-quotations/api/purchase-quotation.queries";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { requireActiveSession } from "@/shared/auth/require-active-session";

export const Route = createFileRoute("/_layout/purchase/quotations/$docNum/update")({
  beforeLoad: async () => {
    await requireActiveSession();
  },
  component: PurchaseQuotationEditPage,
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(purchaseQuotationQueries.detailByDocNum(params.docNum)),
  pendingComponent: CreatePageRouteSkeleton,
  validateSearch: createPageHighlightSearchSchema,
});

function PurchaseQuotationEditPage() {
  const { docNum } = Route.useParams();
  const { highlightDocNum, highlightUntil } = Route.useSearch();
  useDocumentTitle(`Update Purchase Quotation ${docNum} | ERP Portal`);
  return (
    <PurchaseQuotationCreate
      docNum={docNum}
      mode="edit"
      {...toCreatePageHighlightProps(highlightDocNum, highlightUntil)}
    />
  );
}
