import { createFileRoute } from "@tanstack/react-router";
import { startTransition } from "react";
import { z } from "zod";
import { InventoryDashboard } from "@/features/dashboard/components/InventoryDashboard";
import type { DashboardPeriod } from "@/features/dashboard/utils/types";
import { useDocumentTitle } from "@/hooks/use-document-title";

const searchSchema = z.object({
  period: z.enum(["week", "month", "year", "all"]).default("week"),
});

export const Route = createFileRoute("/_layout/dashboard/inventory")({
  validateSearch: (search) => searchSchema.parse(search),
  component: InventoryDashboardRouteComponent,
});

function InventoryDashboardRouteComponent() {
  useDocumentTitle("Inventory Dashboard | ERP Portal");
  const { period } = Route.useSearch();
  const navigate = Route.useNavigate();

  const handlePeriodChange = (newPeriod: DashboardPeriod) => {
    startTransition(() => {
      navigate({
        search: ((old: any) => ({
          ...old,
          period: newPeriod,
        })) as any,
      });
    });
  };

  return (
    <InventoryDashboard period={period as DashboardPeriod} onPeriodChange={handlePeriodChange} />
  );
}
