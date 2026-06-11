import type { DashboardArea, DashboardPeriod } from "../utils/types";
import {
  useDashboardKpiSummary,
  useDashboardModuleCards,
  useDashboardTrend,
  useDashboardFunnel,
  useDashboardTopPartners,
  useDashboardExceptions,
} from "../queries/queries";
import { ModuleTiles } from "./ModuleTiles";
import { ModuleCards } from "./ModuleCards";
import { TrendChart } from "./TrendChart";
import { FunnelChart } from "./FunnelChart";
import { PartnerTable } from "./PartnerTable";
import { ExceptionsTable } from "./ExceptionsTable";
import {
  ModuleTilesSkeleton,
  ModuleCardsSkeleton,
  TrendChartSkeleton,
  FunnelChartSkeleton,
  PartnerTableSkeleton,
  ExceptionsTableSkeleton,
} from "./DashboardSkeletons";
import { DashboardSwitchBar } from "./DashboardSwitchBar";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface DashboardCanvasProps {
  area: DashboardArea;
  period: DashboardPeriod;
}

export function DashboardCanvas({ area, period }: DashboardCanvasProps) {
  const color = area === "purchase" ? "blue" : "indigo";

  // Run all queries in parallel for streaming segments
  const kpiQuery = useDashboardKpiSummary(area, period);
  const modulesQuery = useDashboardModuleCards(area, period);
  const trendQuery = useDashboardTrend(area, period);
  const funnelQuery = useDashboardFunnel(area, period);
  const partnersQuery = useDashboardTopPartners(area, period);
  const exceptionsQuery = useDashboardExceptions(area, period);

  const queries = [kpiQuery, modulesQuery, trendQuery, funnelQuery, partnersQuery, exceptionsQuery];

  const hasError = queries.some((q) => q.isError);
  const isFetching = queries.some((q) => q.isFetching);

  const handleRetry = () => {
    queries.forEach((q) => q.refetch());
  };

  // If any query failed and we have no valid data to show
  if (hasError) {
    return (
      <div className="bg-white border border-rose-200/70 rounded-2xl p-12 text-center shadow-sm flex flex-col items-center justify-center gap-4 max-w-xl mx-auto my-12">
        <div className="p-3.5 bg-rose-50 rounded-2xl border border-rose-100/50 text-rose-600 animate-bounce">
          <AlertTriangle className="size-8" />
        </div>
        <div className="flex flex-col gap-1">
          <h3 className="text-lg font-bold text-zinc-900">Failed to Load Dashboard</h3>
          <p className="text-xs text-zinc-500 font-medium max-w-sm">
            We encountered a problem retrieving your dashboard metrics. This may be due to a
            temporary network issue or session expiry.
          </p>
        </div>
        <button
          onClick={handleRetry}
          className="inline-flex items-center gap-2 cursor-pointer bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-semibold px-4.5 py-2 rounded-xl transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-zinc-950/20 active:scale-95"
        >
          <RefreshCw className="size-3.5" />
          Retry Request
        </button>
      </div>
    );
  }

  // Get common currency code from loaded datasets
  const currency = kpiQuery.data?.currency || modulesQuery.data?.currency || "$";

  return (
    <div className="flex flex-col gap-6 w-full relative">
      {/* Switch loading bar during background fetching (period changes) */}
      <div className="fixed top-0 left-0 right-0 h-[5px] overflow-hidden z-[9999] pointer-events-none">
        <DashboardSwitchBar isSwitchLoading={isFetching} area={area} />
      </div>

      {/* Module Tiles (displays the summary metrics) */}
      {kpiQuery.isLoading ? (
        <ModuleTilesSkeleton area={area} />
      ) : (
        <ModuleTiles metrics={kpiQuery.data?.data} currency={currency} />
      )}

      {/* Module Cards */}
      {modulesQuery.isLoading ? (
        <ModuleCardsSkeleton area={area} />
      ) : (
        <ModuleCards modules={modulesQuery.data?.data} currency={currency} />
      )}

      {/* Trend Chart + Process Flow side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_420px] gap-6 items-stretch">
        {trendQuery.isLoading ? (
          <TrendChartSkeleton area={area} period={period} />
        ) : (
          <TrendChart trend={trendQuery.data?.data} currency={currency} color={color} />
        )}
        {funnelQuery.isLoading ? (
          <FunnelChartSkeleton area={area} period={period} />
        ) : (
          <FunnelChart
            steps={funnelQuery.data?.data}
            currency={currency}
            color={color}
            period={period}
          />
        )}
      </div>

      {/* Pareto top partners (Pareto Analytics Redesigned) */}
      {partnersQuery.isLoading ? (
        <PartnerTableSkeleton area={area} />
      ) : (
        <PartnerTable groups={partnersQuery.data?.data} currency={currency} color={color} />
      )}

      {/* Actionable exceptions */}
      {exceptionsQuery.isLoading ? (
        <ExceptionsTableSkeleton area={area} />
      ) : (
        <ExceptionsTable groups={exceptionsQuery.data?.data} currency={currency} color={color} />
      )}
    </div>
  );
}
