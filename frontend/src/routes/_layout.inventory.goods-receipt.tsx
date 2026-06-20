import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { TableSkeleton } from "@/components/skeleton/Table-skeleton";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { requireActiveSession } from "@/routes/_require-active-session";
import { goodsReceiptSearchSchema } from "@/features/table-pages/goods-receipt/schemas/goods-receipt-search.schema";

const GoodsReceiptTable = lazy(() =>
  import("@/features/table-pages/goods-receipt/components/goods-receipt-table").then((module) => ({
    default: module.GoodsReceiptTable,
  })),
);

export const Route = createFileRoute("/_layout/inventory/goods-receipt")({
  beforeLoad: async () => {
    await requireActiveSession();
  },
  validateSearch: (search) => goodsReceiptSearchSchema.parse(search),
  component: RouteComponent,
});

function RouteComponent() {
  useDocumentTitle("Goods Receipt | ERP Portal");
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const isSubRoute =
    pathname === "/inventory/goods-receipt/create" ||
    (pathname.startsWith("/inventory/goods-receipt/") && pathname.endsWith("/edit"));

  if (isSubRoute) {
    return <Outlet />;
  }

  return (
    <div className="h-full w-full">
      <Suspense fallback={<TableSkeleton />}>
        <GoodsReceiptTable />
      </Suspense>
    </div>
  );
}
