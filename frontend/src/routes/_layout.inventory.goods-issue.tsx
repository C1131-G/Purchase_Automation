import { createFileRoute } from "@tanstack/react-router";
import { requireActiveSession } from "@/routes/_require-active-session";
import { InventoryRouteComponent } from "@/features/create-pages/create-shared/components/inventory/inventory-route";
import { GoodsIssueCreate } from "@/features/create-pages/goods-issue-create/components/goods-issue-create";

export const Route = createFileRoute("/_layout/inventory/goods-issue")({
  beforeLoad: async () => {
    await requireActiveSession();
  },
  component: () => (
    <InventoryRouteComponent title="Create Goods Issue | ERP Portal" component={GoodsIssueCreate} />
  ),
});
