import { createFileRoute } from "@tanstack/react-router";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { requireActiveSession } from "@/routes/_require-active-session";

export const Route = createFileRoute("/_layout/inventory/goods-receipt")({
  beforeLoad: async () => {
    await requireActiveSession();
  },
  component: RouteComponent,
});

function RouteComponent() {
  useDocumentTitle("Goods Receipt | ERP Portal");
  return (
    <div className="flex items-center justify-center h-full w-full p-6">
      <div className="bg-white rounded-xl border border-zinc-100 p-8 max-w-md w-full shadow-xs text-center">
        <h2 className="text-xl font-bold text-zinc-900 mb-2">Goods Receipt</h2>
        <p className="text-zinc-500 text-sm">
          This section is a placeholder and will display the Goods Receipt document entry or listing
          in the future.
        </p>
      </div>
    </div>
  );
}
