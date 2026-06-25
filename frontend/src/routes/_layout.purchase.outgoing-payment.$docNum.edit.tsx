import { createFileRoute } from "@tanstack/react-router";

import { OutgoingPaymentEditSkeleton } from "@/components/skeleton/outgoing-payment-edit-skeleton";
import { OutgoingPaymentEdit } from "@/features/create-pages/outgoing-payment-create/components/outgoing-payment-edit";
import { outgoingPaymentQueries } from "@/features/table-pages/outgoing-payment/api/outgoing-payment.queries";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { requireActiveSession } from "@/routes/_require-active-session";

export const Route = createFileRoute("/_layout/purchase/outgoing-payment/$docNum/edit")({
  beforeLoad: async () => {
    await requireActiveSession();
  },
  component: OutgoingPaymentEditPage,
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(outgoingPaymentQueries.detail(params.docNum)),
  pendingComponent: OutgoingPaymentEditSkeleton,
});

function OutgoingPaymentEditPage() {
  const { docNum } = Route.useParams();
  useDocumentTitle(`Update Outgoing Payment ${docNum} | ERP Portal`);
  return <OutgoingPaymentEdit docNum={docNum} />;
}
