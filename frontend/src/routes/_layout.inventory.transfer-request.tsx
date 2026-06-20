import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { TableSkeleton } from "@/components/skeleton/Table-skeleton";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { requireActiveSession } from "@/routes/_require-active-session";
import { transferRequestSearchSchema } from "@/features/table-pages/transfer-request/schemas/transfer-request-search.schema";

const TransferRequestTable = lazy(() =>
  import("@/features/table-pages/transfer-request/components/transfer-request-table").then(
    (module) => ({
      default: module.TransferRequestTable,
    }),
  ),
);

export const Route = createFileRoute("/_layout/inventory/transfer-request")({
  beforeLoad: async () => {
    await requireActiveSession();
  },
  validateSearch: (search) => transferRequestSearchSchema.parse(search),
  component: RouteComponent,
});

function RouteComponent() {
  useDocumentTitle("Inventory Transfer Request | ERP Portal");
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const isSubRoute =
    pathname === "/inventory/transfer-request/create" ||
    (pathname.startsWith("/inventory/transfer-request/") && pathname.endsWith("/edit"));

  if (isSubRoute) {
    return <Outlet />;
  }

  return (
    <div className="h-full w-full">
      <Suspense fallback={<TableSkeleton />}>
        <TransferRequestTable />
      </Suspense>
    </div>
  );
}
