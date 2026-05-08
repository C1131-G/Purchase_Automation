import { createFileRoute } from "@tanstack/react-router";

import { CreatePageRouteSkeleton } from "@/components/skeleton/create-page-route-skeleton";
import APCreditMemoCreate from "@/features/create-pages/ap-credit-memo-create/components/ap-credit-memo-create";
import { apCreditMemoQueries } from "@/features/table-pages/ap-credit-memo/api/ap-credit-memo.queries";
import { requireActiveSession } from "@/routes/_require-active-session";

/** PurchaseAPCreditMemoEditRoute: Page for editing existing AP Credit Memos. */
export const Route = createFileRoute("/_layout/purchase/ap-credit-memo/$docNum/edit")({
  beforeLoad: async () => {
    await requireActiveSession();
  },
  component: RouteComponent,
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(apCreditMemoQueries.detailByDocNum(params.docNum)),
  pendingComponent: CreatePageRouteSkeleton,
});

function RouteComponent() {
  const { docNum } = Route.useParams();
  return <APCreditMemoCreate mode="edit" docNum={docNum} />;
}
