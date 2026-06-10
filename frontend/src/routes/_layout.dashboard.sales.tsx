import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { SalesDashboard } from "@/features/dashboard/components/SalesDashboard";
import type { DashboardPeriod } from "@/features/dashboard/utils/types";

const searchSchema = z.object({
  period: z.enum(["week", "month", "year", "all"]).default("week"),
});

export const Route = createFileRoute("/_layout/dashboard/sales")({
  validateSearch: (search) => searchSchema.parse(search),
  component: SalesDashboardRouteComponent,
});

function SalesDashboardRouteComponent() {
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
