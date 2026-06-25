import { createFileRoute } from "@tanstack/react-router";

import { CreatePageRouteSkeleton } from "@/components/skeleton/create-page-route-skeleton";
import { CreateIncomingPaymentForm } from "@/features/create-pages/incoming-payment-create";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { requireActiveSession } from "@/routes/_require-active-session";

/** SalesIncomingPaymentCreateRoute: Page for creating new Incoming Payments. */
export const Route = createFileRoute("/_layout/sales/create-incoming-payment")({
  beforeLoad: async () => {
    await requireActiveSession();
  },
  component: RouteComponent,
  pendingComponent: CreatePageRouteSkeleton,
});

function RouteComponent() {
  useDocumentTitle("Create Incoming Payment | ERP Portal");
  return <CreateIncomingPaymentForm />;
}
