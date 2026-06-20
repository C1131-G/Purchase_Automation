import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { TableSkeleton } from "@/components/skeleton/Table-skeleton";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { requireActiveSession } from "@/routes/_require-active-session";
import { goodsIssueSearchSchema } from "@/features/table-pages/goods-issue/schemas/goods-issue-search.schema";

const GoodsIssueTable = lazy(() =>
  import("@/features/table-pages/goods-issue/components/goods-issue-table").then((module) => ({
    default: module.GoodsIssueTable,
  })),
);

export const Route = createFileRoute("/_layout/inventory/goods-issue")({
  beforeLoad: async () => {
    await requireActiveSession();
  },
  validateSearch: (search) => goodsIssueSearchSchema.parse(search),
  component: RouteComponent,
});

function RouteComponent() {
  useDocumentTitle("Goods Issue | ERP Portal");
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const isSubRoute =
    pathname === "/inventory/goods-issue/create" ||
    (pathname.startsWith("/inventory/goods-issue/") && pathname.endsWith("/edit"));

  if (isSubRoute) {
    return <Outlet />;
  }

  return (
    <div className="h-full w-full">
      <Suspense fallback={<TableSkeleton />}>
        <GoodsIssueTable />
      </Suspense>
    </div>
  );
}
