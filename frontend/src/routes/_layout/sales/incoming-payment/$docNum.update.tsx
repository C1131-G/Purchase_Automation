import { createFileRoute } from "@tanstack/react-router";

import { CreatePageRouteSkeleton } from "@/components/skeleton/create-page-route-skeleton";
import { IncomingPaymentEdit } from "@/features/create-pages/incoming-payment-create/components/incoming-payment-edit";
import { incomingPaymentQueries } from "@/features/table-pages/incoming-payment/api/incoming-payment.queries";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { requireActiveSession } from "@/shared/auth/require-active-session";

export const Route = createFileRoute("/_layout/sales/incoming-payment/$docNum/update")({
  beforeLoad: async () => {
    await requireActiveSession();
  },
  component: IncomingPaymentEditPage,
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(incomingPaymentQueries.detail(params.docNum)),
  pendingComponent: CreatePageRouteSkeleton,
});

function IncomingPaymentEditPage() {
  const { docNum } = Route.useParams();
  useDocumentTitle(`Update Incoming Payment ${docNum} | ERP Portal`);
  return <IncomingPaymentEdit docNum={docNum} />;
}
