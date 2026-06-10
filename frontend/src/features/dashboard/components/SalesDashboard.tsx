import type { DashboardPeriod } from "../utils/types";
import { DashboardHeader } from "./DashboardHeader";
import { DashboardSwitchBar } from "./DashboardSwitchBar";
import { DashboardWorkspace } from "./DashboardWorkspace";
import { SalesDashboardCanvas } from "./SalesDashboardCanvas";

interface SalesDashboardProps {
  period: DashboardPeriod;
  onPeriodChange: (period: DashboardPeriod) => void;
}

export function SalesDashboard({ period, onPeriodChange }: SalesDashboardProps) {
  return (
    <div className="h-full w-full bg-zinc-50 flex flex-col overflow-hidden">
      {/* Top Header with title and period select */}
      <DashboardHeader area="sales" period={period} onPeriodChange={onPeriodChange} />

      {/* Thin loading bar reflecting background queries */}
      <DashboardSwitchBar color="indigo" />

      {/* Main scrollable content workspace */}
      <DashboardWorkspace>
        <SalesDashboardCanvas period={period} />
      </DashboardWorkspace>
    </div>
  );
}
