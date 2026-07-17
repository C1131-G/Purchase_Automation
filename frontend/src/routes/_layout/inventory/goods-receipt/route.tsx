import { createFileRoute, Outlet, useMatches } from "@tanstack/react-router";
import { GoodsReceiptTable } from "@/features/table-pages/goods-receipt/components/goods-receipt-table";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { requireActiveSession } from "@/shared/auth/require-active-session";
import { goodsReceiptSearchSchema } from "@/features/table-pages/goods-receipt/schemas/goods-receipt-search.schema";

export const Route = createFileRoute("/_layout/inventory/goods-receipt")({
  beforeLoad: async () => {
    await requireActiveSession();
  },
  validateSearch: (search) => goodsReceiptSearchSchema.parse(search),
  component: RouteComponent,
});

function RouteComponent() {
  useDocumentTitle("Goods Receipt | ERP Portal");
  const matches = useMatches();
  const isSubRoute = matches.some((m) => m.id.endsWith("/update") || m.id.endsWith("/create"));

  if (isSubRoute) {
    return <Outlet />;
  }

  return (
    <div className="h-full w-full">
      <GoodsReceiptTable />
    </div>
  );
}
