import { createFileRoute } from "@tanstack/react-router";

import { CreatePageRouteSkeleton } from "@/components/skeleton/create-page-route-skeleton";
import { ARInvoiceCreate } from "@/features/create-pages/ar-invoice-create/components/ar-invoice-create";
import { arInvoiceQueries } from "@/features/table-pages/ar-invoices/api/ar-invoice.queries";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { requireActiveSession } from "@/routes/_require-active-session";

export const Route = createFileRoute("/_layout/sales/ar-invoice/$docNum/edit")({
  beforeLoad: async () => {
    await requireActiveSession();
  },
  component: ARInvoiceEditPage,
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(arInvoiceQueries.detailByDocNum(params.docNum)),
  pendingComponent: CreatePageRouteSkeleton,
});

function ARInvoiceEditPage() {
  const { docNum } = Route.useParams();
  useDocumentTitle(`Update AR Invoice ${docNum} | ERP Portal`);
  return <ARInvoiceCreate mode="edit" docNum={docNum} />;
}
