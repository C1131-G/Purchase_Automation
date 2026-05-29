import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

import { TableSkeleton } from "@/components/skeleton/Table-skeleton";
import { purchaseQuotationSearchSchema } from "@/features/table-pages/purchase-quotations/schemas/purchase-quotation-search.schema";

const PurchaseQuotationTable = lazy(() =>
  import("@/features/table-pages/purchase-quotations/components/purchase-quotation-table").then(
    (module) => ({
      default: module.PurchaseQuotationTable,
    }),
  ),
);

export const Route = createFileRoute("/_layout/purchase/quotations")({
  component: RouteComponent,
  validateSearch: (search) => purchaseQuotationSearchSchema.parse(search),
});

function RouteComponent() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const isEditRoute = pathname.startsWith("/purchase/quotations/") && pathname.endsWith("/edit");

  if (isEditRoute) {
    return <Outlet />;
  }

  return (
    <div className="h-full w-full">
      <Suspense fallback={<TableSkeleton />}>
        <PurchaseQuotationTable />
      </Suspense>
    </div>
  );
}
