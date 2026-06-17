import { createFileRoute } from "@tanstack/react-router";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { requireActiveSession } from "@/routes/_require-active-session";
import { GoodsIssueCreate } from "@/features/create-pages/goods-issue-create/components/goods-issue-create";

export const Route = createFileRoute("/_layout/inventory/goods-issue")({
  beforeLoad: async () => {
    await requireActiveSession();
  },
  component: RouteComponent,
});

function RouteComponent() {
  useDocumentTitle("Create Goods Issue | ERP Portal");
  return <GoodsIssueCreate />;
}
