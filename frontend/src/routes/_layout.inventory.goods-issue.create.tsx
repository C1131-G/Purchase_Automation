import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { CreatePageRouteSkeleton } from "@/components/skeleton/create-page-route-skeleton";
import { requireActiveSession } from "@/routes/_require-active-session";

const GoodsIssueCreate = lazy(() =>
  import("@/features/create-pages/goods-issue-create/components/goods-issue-create").then(
    (module) => ({
      default: module.GoodsIssueCreate,
    }),
  ),
);

export const Route = createFileRoute("/_layout/inventory/goods-issue/create")({
  beforeLoad: async () => {
    await requireActiveSession();
  },
  component: RouteComponent,
  pendingComponent: CreatePageRouteSkeleton,
});

function RouteComponent() {
  return (
    <Suspense fallback={<CreatePageRouteSkeleton />}>
      <GoodsIssueCreate />
    </Suspense>
  );
}
