import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { CreatePageRouteSkeleton } from "@/components/skeleton/create-page-route-skeleton";
import { requireActiveSession } from "@/routes/_require-active-session";

const GoodsReceiptCreate = lazy(() =>
  import("@/features/create-pages/goods-receipt-create/components/goods-receipt-create").then(
    (module) => ({
      default: module.GoodsReceiptCreate,
    }),
  ),
);

export const Route = createFileRoute("/_layout/inventory/goods-receipt/create")({
  beforeLoad: async () => {
    await requireActiveSession();
  },
  component: RouteComponent,
  pendingComponent: CreatePageRouteSkeleton,
});

function RouteComponent() {
  return (
    <Suspense fallback={<CreatePageRouteSkeleton />}>
      <GoodsReceiptCreate />
    </Suspense>
  );
}
