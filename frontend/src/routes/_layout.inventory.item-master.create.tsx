import { createFileRoute } from "@tanstack/react-router";
import { CreatePageRouteSkeleton } from "@/components/skeleton/create-page-route-skeleton";
import { ItemMasterCreate } from "@/features/create-pages/item-master-create/components/item-master-create";
import { requireActiveSession } from "@/routes/_require-active-session";

export const Route = createFileRoute("/_layout/inventory/item-master/create")({
  beforeLoad: async () => {
    await requireActiveSession();
  },
  component: RouteComponent,
  pendingComponent: CreatePageRouteSkeleton,
});

function RouteComponent() {
  return <ItemMasterCreate />;
}
