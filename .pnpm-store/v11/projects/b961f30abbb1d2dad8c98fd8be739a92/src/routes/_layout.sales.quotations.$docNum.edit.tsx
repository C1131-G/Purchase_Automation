import { createFileRoute } from "@tanstack/react-router";

import { CreatePageRouteSkeleton } from "@/components/skeleton/create-page-route-skeleton";
import { SalesQuotationCreate } from "@/features/create-pages/sales-quotation-create/components/sales-quotation-create";
import { salesQuotationQueries } from "@/features/table-pages/sales-quotations/api/sales-quotation.queries";
import { requireActiveSession } from "@/routes/_require-active-session";

export const Route = createFileRoute("/_layout/sales/quotations/$docNum/edit")({
  beforeLoad: async () => {
    await requireActiveSession();
  },
  component: SalesQuotationEditPage,
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(salesQuotationQueries.detailByDocNum(params.docNum)),
  pendingComponent: CreatePageRouteSkeleton,
});

function SalesQuotationEditPage() {
  const { docNum } = Route.useParams();
  return <SalesQuotationCreate mode="edit" docNum={docNum} />;
}
