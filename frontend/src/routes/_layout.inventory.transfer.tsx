import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { TableSkeleton } from "@/components/skeleton/Table-skeleton";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { requireActiveSession } from "@/routes/_require-active-session";
import { transferSearchSchema } from "@/features/table-pages/transfer/schemas/transfer-search.schema";

const TransferTable = lazy(() =>
  import("@/features/table-pages/transfer/components/transfer-table").then((module) => ({
    default: module.TransferTable,
  })),
);

export const Route = createFileRoute("/_layout/inventory/transfer")({
  beforeLoad: async () => {
    await requireActiveSession();
  },
  validateSearch: (search) => transferSearchSchema.parse(search),
  component: RouteComponent,
});

function RouteComponent() {
  useDocumentTitle("Inventory Transfer | ERP Portal");
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const isSubRoute =
    pathname === "/inventory/transfer/create" ||
    (pathname.startsWith("/inventory/transfer/") && pathname.endsWith("/edit"));

  if (isSubRoute) {
    return <Outlet />;
  }

  return (
    <div className="h-full w-full">
      <Suspense fallback={<TableSkeleton />}>
        <TransferTable />
      </Suspense>
    </div>
  );
}
