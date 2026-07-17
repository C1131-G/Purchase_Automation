import { createFileRoute, Outlet, useMatches } from "@tanstack/react-router";
import { GoodsIssueTable } from "@/features/table-pages/goods-issue/components/goods-issue-table";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { requireActiveSession } from "@/shared/auth/require-active-session";
import { goodsIssueSearchSchema } from "@/features/table-pages/goods-issue/schemas/goods-issue-search.schema";

export const Route = createFileRoute("/_layout/inventory/goods-issue")({
  beforeLoad: async () => {
    await requireActiveSession();
  },
  validateSearch: (search) => goodsIssueSearchSchema.parse(search),
  component: RouteComponent,
});

function RouteComponent() {
  useDocumentTitle("Goods Issue | ERP Portal");
  const matches = useMatches();
  const isSubRoute = matches.some((m) => m.id.endsWith("/update") || m.id.endsWith("/create"));

  if (isSubRoute) {
    return <Outlet />;
  }

  return (
    <div className="h-full w-full">
      <GoodsIssueTable />
    </div>
  );
}
