import { createFileRoute } from "@tanstack/react-router";

import { CreatePageRouteSkeleton } from "@/components/skeleton/create-page-route-skeleton";
import { GoodsIssueUpdate } from "@/features/create-pages/goods-issue-create/components/goods-issue-update";
import { goodsIssueQueries } from "@/features/table-pages/goods-issue/api/goods-issue.queries";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { requireActiveSession } from "@/shared/auth/require-active-session";

export const Route = createFileRoute("/_layout/inventory/goods-issue/$docNum/update")({
  beforeLoad: async () => {
    await requireActiveSession();
  },
  component: GoodsIssueEditPage,
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(goodsIssueQueries.detailById(params.docNum)),
  pendingComponent: CreatePageRouteSkeleton,
});

function GoodsIssueEditPage() {
  const { docNum } = Route.useParams();
  useDocumentTitle(`Update Goods Issue ${docNum} | ERP Portal`);
  return <GoodsIssueUpdate docNum={docNum} />;
}
