import { createFileRoute } from "@tanstack/react-router";

import { CreatePageRouteSkeleton } from "@/components/skeleton/create-page-route-skeleton";
import { GoodsReceiptUpdate } from "@/features/create-pages/goods-receipt-create/components/goods-receipt-update";
import { goodsReceiptQueries } from "@/features/table-pages/goods-receipt/api/goods-receipt.queries";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { requireActiveSession } from "@/shared/auth/require-active-session";

export const Route = createFileRoute("/_layout/inventory/goods-receipt/$docNum/update")({
  beforeLoad: async () => {
    await requireActiveSession();
  },
  component: GoodsReceiptEditPage,
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(goodsReceiptQueries.detailById(params.docNum)),
  pendingComponent: CreatePageRouteSkeleton,
});

function GoodsReceiptEditPage() {
  const { docNum } = Route.useParams();
  useDocumentTitle(`Update Goods Receipt ${docNum} | ERP Portal`);
  return <GoodsReceiptUpdate docNum={docNum} />;
}
