import { createFileRoute } from "@tanstack/react-router";
import { CreatePageRouteSkeleton } from "@/components/skeleton/create-page-route-skeleton";
import { TransferCreate } from "@/features/create-pages/transfer-create/components/transfer-create";
import { requireActiveSession } from "@/routes/_require-active-session";

export const Route = createFileRoute("/_layout/inventory/transfer-request/create")({
  beforeLoad: async () => {
    await requireActiveSession();
  },
  component: RouteComponent,
  pendingComponent: CreatePageRouteSkeleton,
});

function RouteComponent() {
  return (
    <TransferCreate
      pageTitle="Create Inventory Transfer Request"
      breadcrumbTo="/inventory/transfer-request"
      isRequest={true}
    />
  );
}
