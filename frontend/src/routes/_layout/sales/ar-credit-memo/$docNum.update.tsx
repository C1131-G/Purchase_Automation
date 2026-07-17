import { createFileRoute } from "@tanstack/react-router";

import { CreatePageRouteSkeleton } from "@/components/skeleton/create-page-route-skeleton";
import { ArCreditMemoCreate } from "@/features/create-pages/ar-credit-memo-create/components/ar-credit-memo-create";
import { arCreditMemoQueries } from "@/features/table-pages/ar-credit-memo/api/ar-credit-memo.queries";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { requireActiveSession } from "@/shared/auth/require-active-session";

export const Route = createFileRoute("/_layout/sales/ar-credit-memo/$docNum/update")({
  beforeLoad: async () => {
    await requireActiveSession();
  },
  component: ArCreditMemoEditPage,
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(arCreditMemoQueries.detailByDocNum(params.docNum)),
  pendingComponent: CreatePageRouteSkeleton,
});

function ArCreditMemoEditPage() {
  const { docNum } = Route.useParams();
  useDocumentTitle(`Update AR Credit Memo ${docNum} | ERP Portal`);
  return <ArCreditMemoCreate mode="edit" docNum={docNum} />;
}
