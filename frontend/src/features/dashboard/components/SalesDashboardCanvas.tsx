import type { DashboardPeriod } from "../utils/types";
import { DashboardCanvas } from "./DashboardCanvas";

interface SalesDashboardCanvasProps {
  period: DashboardPeriod;
}

export function SalesDashboardCanvas({ period }: SalesDashboardCanvasProps) {
  return <DashboardCanvas area="sales" period={period} />;
}
