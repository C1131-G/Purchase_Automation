import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { CreatePageRouteSkeleton } from "@/components/skeleton/create-page-route-skeleton";
import { requireActiveSession } from "@/routes/_require-active-session";

const TransferCreate = lazy(() =>
  import("@/features/create-pages/transfer-create/components/transfer-create").then((module) => ({
    default: module.TransferCreate,
  })),
);

export const Route = createFileRoute("/_layout/inventory/transfer/create")({
  beforeLoad: async () => {
    await requireActiveSession();
  },
  component: RouteComponent,
  pendingComponent: CreatePageRouteSkeleton,
});

function RouteComponent() {
  return (
    <Suspense fallback={<CreatePageRouteSkeleton />}>
      <TransferCreate
        pageTitle="Create Inventory Transfer"
        breadcrumbTo="/inventory/transfer"
        isRequest={false}
      />
    </Suspense>
  );
}
