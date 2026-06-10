import type { DashboardPeriod } from "../utils/types";
import { DashboardHeader } from "./DashboardHeader";
import { DashboardWorkspace } from "./DashboardWorkspace";
import { PurchaseDashboardCanvas } from "./PurchaseDashboardCanvas";

interface PurchaseDashboardProps {
  period: DashboardPeriod;
  onPeriodChange: (period: DashboardPeriod) => void;
}

export function PurchaseDashboard({ period, onPeriodChange }: PurchaseDashboardProps) {
  return (
    <div className="h-full w-full bg-zinc-50 flex flex-col overflow-hidden">
      {/* Top Header with title and period select */}
      <DashboardHeader area="purchase" period={period} onPeriodChange={onPeriodChange} />

      {/* Main scrollable content workspace */}
      <DashboardWorkspace>
        <PurchaseDashboardCanvas period={period} />
      </DashboardWorkspace>
    </div>
  );
}
