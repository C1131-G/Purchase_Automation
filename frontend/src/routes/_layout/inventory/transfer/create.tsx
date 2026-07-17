import { createFileRoute } from "@tanstack/react-router";
import { CreatePageRouteSkeleton } from "@/components/skeleton/create-page-route-skeleton";
import { TransferCreate } from "@/features/create-pages/transfer-create/components/transfer-create";
import { requireActiveSession } from "@/shared/auth/require-active-session";

export const Route = createFileRoute("/_layout/inventory/transfer/create")({
  beforeLoad: async () => {
    await requireActiveSession();
  },
  component: RouteComponent,
  pendingComponent: CreatePageRouteSkeleton,
});

function RouteComponent() {
  return (
    <TransferCreate
      pageTitle="Create Inventory Transfer"
      breadcrumbTo="/inventory/transfer"
      isRequest={false}
    />
  );
}
