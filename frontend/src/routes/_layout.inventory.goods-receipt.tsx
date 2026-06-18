import { createFileRoute } from "@tanstack/react-router";
import { requireActiveSession } from "@/routes/_require-active-session";
import { InventoryRouteComponent } from "@/features/create-pages/create-shared/components/inventory/inventory-route";
import { GoodsReceiptCreate } from "@/features/create-pages/goods-receipt-create/components/goods-receipt-create";

export const Route = createFileRoute("/_layout/inventory/goods-receipt")({
  beforeLoad: async () => {
    await requireActiveSession();
  },
  component: () => (
    <InventoryRouteComponent title="Goods Receipt | ERP Portal" component={GoodsReceiptCreate} />
  ),
});
