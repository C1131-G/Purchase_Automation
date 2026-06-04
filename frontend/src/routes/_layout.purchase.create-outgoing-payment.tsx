import { createFileRoute } from "@tanstack/react-router";

import { CreateOutgoingPaymentSkeleton } from "@/components/skeleton/create-outgoing-payment-skeleton";
import { CreateOutgoingPaymentForm } from "@/features/create-pages/outgoing-payment-create";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { requireActiveSession } from "@/routes/_require-active-session";

/** PurchaseOutgoingPaymentCreateRoute: Page for creating new Outgoing Payments. */
export const Route = createFileRoute("/_layout/purchase/create-outgoing-payment")({
  beforeLoad: async () => {
    await requireActiveSession();
  },
  component: RouteComponent,
  pendingComponent: CreateOutgoingPaymentSkeleton,
  pendingMs: 0,
});

function RouteComponent() {
  useDocumentTitle("Create Outgoing Payment | ERP Portal");
  return <CreateOutgoingPaymentForm />;
}
