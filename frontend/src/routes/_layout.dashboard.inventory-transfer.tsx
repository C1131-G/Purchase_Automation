import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { useDocumentTitle } from "@/hooks/use-document-title";

const searchSchema = z.object({
  period: z.enum(["week", "month", "year", "all"]).default("week"),
});

export const Route = createFileRoute("/_layout/dashboard/inventory-transfer")({
  validateSearch: (search) => searchSchema.parse(search),
  component: InventoryTransferDashboardRouteComponent,
});

function InventoryTransferDashboardRouteComponent() {
  useDocumentTitle("Inventory Transfer Dashboard | ERP Portal");
  return (
    <div className="flex items-center justify-center h-full w-full p-6">
      <div className="bg-white rounded-xl border border-zinc-100 p-8 max-w-md w-full shadow-xs text-center">
        <h2 className="text-xl font-bold text-zinc-900 mb-2">Inventory Transfer Dashboard</h2>
        <p className="text-zinc-500 text-sm">
          This dashboard section is a placeholder and will display inventory transfer transaction
          summaries and KPIs in the future.
        </p>
      </div>
    </div>
  );
}
