import type { DashboardPeriod } from "../utils/types";
import { DashboardCanvas } from "./DashboardCanvas";

interface PurchaseDashboardCanvasProps {
  period: DashboardPeriod;
}

export function PurchaseDashboardCanvas({ period }: PurchaseDashboardCanvasProps) {
  return <DashboardCanvas area="purchase" period={period} />;
}
