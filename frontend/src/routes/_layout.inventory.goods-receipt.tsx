import { createFileRoute } from "@tanstack/react-router";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { requireActiveSession } from "@/routes/_require-active-session";
import { GoodsReceiptCreate } from "@/features/create-pages/goods-receipt-create/components/goods-receipt-create";

export const Route = createFileRoute("/_layout/inventory/goods-receipt")({
  beforeLoad: async () => {
    await requireActiveSession();
  },
  component: RouteComponent,
});

function RouteComponent() {
  useDocumentTitle("Goods Receipt | ERP Portal");
  return <GoodsReceiptCreate />;
}
