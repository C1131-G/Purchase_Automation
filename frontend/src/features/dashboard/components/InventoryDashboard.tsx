import type { DashboardPeriod } from "../utils/types";
import { DashboardHeader } from "./DashboardHeader";
import { DashboardWorkspace } from "./DashboardWorkspace";
import { InventoryDashboardCanvas } from "./InventoryDashboardCanvas";

interface InventoryDashboardProps {
  period: DashboardPeriod;
  onPeriodChange: (period: DashboardPeriod) => void;
}

export function InventoryDashboard({ period, onPeriodChange }: InventoryDashboardProps) {
  return (
    <div className="h-full w-full bg-zinc-50 flex flex-col overflow-hidden">
      {/* Top Header with title and period select */}
      <DashboardHeader area="inventory" period={period} onPeriodChange={onPeriodChange} />

      {/* Main scrollable content workspace */}
      <DashboardWorkspace>
        <InventoryDashboardCanvas period={period} />
      </DashboardWorkspace>
    </div>
  );
}
