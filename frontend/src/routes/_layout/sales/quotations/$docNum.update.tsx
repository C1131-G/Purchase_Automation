import { createFileRoute } from "@tanstack/react-router";

import { CreatePageRouteSkeleton } from "@/components/skeleton/create-page-route-skeleton";
import {
  createPageHighlightSearchSchema,
  toCreatePageHighlightProps,
} from "@/features/create-pages/create-shared/utils/create-page-highlight";
import { SalesQuotationCreate } from "@/features/create-pages/sales-quotation-create/components/sales-quotation-create";
import { salesQuotationQueries } from "@/features/table-pages/sales-quotations/api/sales-quotation.queries";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { requireActiveSession } from "@/shared/auth/require-active-session";

export const Route = createFileRoute("/_layout/sales/quotations/$docNum/update")({
  beforeLoad: async () => {
    await requireActiveSession();
  },
  component: SalesQuotationEditPage,
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(salesQuotationQueries.detailByDocNum(params.docNum)),
  pendingComponent: CreatePageRouteSkeleton,
  validateSearch: createPageHighlightSearchSchema,
});

function SalesQuotationEditPage() {
  const { docNum } = Route.useParams();
  const { highlightDocNum, highlightUntil } = Route.useSearch();
  useDocumentTitle(`Update Sales Quotation ${docNum} | ERP Portal`);
  return (
    <SalesQuotationCreate
      docNum={docNum}
      mode="edit"
      {...toCreatePageHighlightProps(highlightDocNum, highlightUntil)}
    />
  );
}
