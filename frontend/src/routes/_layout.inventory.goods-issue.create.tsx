import { createFileRoute } from "@tanstack/react-router";
import { CreatePageRouteSkeleton } from "@/components/skeleton/create-page-route-skeleton";
import { GoodsIssueCreate } from "@/features/create-pages/goods-issue-create/components/goods-issue-create";
import { requireActiveSession } from "@/routes/_require-active-session";

export const Route = createFileRoute("/_layout/inventory/goods-issue/create")({
  beforeLoad: async () => {
    await requireActiveSession();
  },
  component: RouteComponent,
  pendingComponent: CreatePageRouteSkeleton,
});

function RouteComponent() {
  return <GoodsIssueCreate />;
}
