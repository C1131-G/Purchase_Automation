import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { CreatePageRouteSkeleton } from "@/components/skeleton/create-page-route-skeleton";
import { requireActiveSession } from "@/routes/_require-active-session";

const ItemMasterCreate = lazy(() =>
  import("@/features/create-pages/item-master-create/components/item-master-create").then(
    (module) => ({
      default: module.ItemMasterCreate,
    }),
  ),
);

export const Route = createFileRoute("/_layout/inventory/item-master/create")({
  beforeLoad: async () => {
    await requireActiveSession();
  },
  component: RouteComponent,
  pendingComponent: CreatePageRouteSkeleton,
});

function RouteComponent() {
  return (
    <Suspense fallback={<CreatePageRouteSkeleton />}>
      <ItemMasterCreate />
    </Suspense>
  );
}
