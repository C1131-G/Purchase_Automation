import { createFileRoute } from "@tanstack/react-router";

import { CreatePageRouteSkeleton } from "@/components/skeleton/create-page-route-skeleton";
import GRPOCreate from "@/features/create-pages/grpo-create/components/grpo-create";
import { grpoQueries } from "@/features/table-pages/grpo/api/grpo.queries";
import { requireActiveSession } from "@/routes/_require-active-session";

export const Route = createFileRoute("/_layout/purchase/grpo/$docNum/edit")({
  beforeLoad: async () => {
    await requireActiveSession();
  },
  component: GRPOEditPage,
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(grpoQueries.detailByDocNum(params.docNum)),
  pendingComponent: CreatePageRouteSkeleton,
});

function GRPOEditPage() {
  const { docNum } = Route.useParams();
  return <GRPOCreate mode="edit" docNum={docNum} />;
}
