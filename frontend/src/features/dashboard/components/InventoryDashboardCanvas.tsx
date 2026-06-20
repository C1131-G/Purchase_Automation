import type { DashboardPeriod } from "../utils/types";
import { DashboardCanvas } from "./DashboardCanvas";

interface InventoryDashboardCanvasProps {
  period: DashboardPeriod;
}

export function InventoryDashboardCanvas({ period }: InventoryDashboardCanvasProps) {
  return <DashboardCanvas area="inventory" period={period} />;
}
