import { createFileRoute } from "@tanstack/react-router";
import { CreatePageRouteSkeleton } from "@/components/skeleton/create-page-route-skeleton";
import { GoodsReceiptCreate } from "@/features/create-pages/goods-receipt-create/components/goods-receipt-create";
import { requireActiveSession } from "@/shared/auth/require-active-session";

export const Route = createFileRoute("/_layout/inventory/goods-receipt/create")({
  beforeLoad: async () => {
    await requireActiveSession();
  },
  component: RouteComponent,
  pendingComponent: CreatePageRouteSkeleton,
});

function RouteComponent() {
  return <GoodsReceiptCreate />;
}
