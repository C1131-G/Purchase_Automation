import { createFileRoute } from "@tanstack/react-router";

import { CreatePageRouteSkeleton } from "@/components/skeleton/create-page-route-skeleton";
import { SalesOrderCreate } from "@/features/create-pages/sales-order-create/components/sales-order-create";
import { salesOrderQueries } from "@/features/table-pages/sales-orders/api/sales-order.queries";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { requireActiveSession } from "@/routes/_require-active-session";

export const Route = createFileRoute("/_layout/sales/orders/$docNum/edit")({
  beforeLoad: async () => {
    await requireActiveSession();
  },
  component: SalesOrderEditPage,
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(salesOrderQueries.detailByDocNum(params.docNum)),
  pendingComponent: CreatePageRouteSkeleton,
});

function SalesOrderEditPage() {
  const { docNum } = Route.useParams();
  useDocumentTitle(`Edit Sales Order #${docNum} | ERP Portal`);
  return <SalesOrderCreate mode="edit" docNum={docNum} />;
}
