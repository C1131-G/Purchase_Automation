import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { SalesDashboard } from "@/features/dashboard/components/SalesDashboard";
import type { DashboardPeriod } from "@/features/dashboard/utils/types";
import { useDocumentTitle } from "@/hooks/use-document-title";

const searchSchema = z.object({
  period: z.enum(["week", "month", "year", "all"]).default("week"),
});

export const Route = createFileRoute("/_layout/dashboard/sales")({
  validateSearch: (search) => searchSchema.parse(search),
  component: SalesDashboardRouteComponent,
});

function SalesDashboardRouteComponent() {
  useDocumentTitle("Sales Dashboard | ERP Portal");
  const { period } = Route.useSearch();
  const navigate = Route.useNavigate();

  const handlePeriodChange = (newPeriod: DashboardPeriod) => {
    navigate({
      search: (old) => ({
        ...old,
        period: newPeriod,
      }),
    });
  };

  return <SalesDashboard period={period as DashboardPeriod} onPeriodChange={handlePeriodChange} />;
}
