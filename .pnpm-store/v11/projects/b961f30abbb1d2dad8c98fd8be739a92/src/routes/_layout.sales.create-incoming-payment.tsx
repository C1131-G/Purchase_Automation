import { createFileRoute } from "@tanstack/react-router";

import { CreatePageRouteSkeleton } from "@/components/skeleton/create-page-route-skeleton";
import { requireActiveSession } from "@/routes/_require-active-session";

/** SalesIncomingPaymentCreateRoute: Page for creating new Incoming Payments. */
export const Route = createFileRoute("/_layout/sales/create-incoming-payment")({
  beforeLoad: async () => {
    await requireActiveSession();
  },
  component: RouteComponent,
  pendingComponent: CreatePageRouteSkeleton,
  pendingMs: 0,
});
import { CreateIncomingPaymentForm } from "@/features/create-pages/incoming-payment-create";

function RouteComponent() {
  return <CreateIncomingPaymentForm />;
}
