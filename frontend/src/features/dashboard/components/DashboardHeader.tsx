import { ChevronRight, Calendar, ShoppingCart, BadgePercent } from "lucide-react";
import type { DashboardPeriod, DashboardArea } from "../utils/types";
import { DASHBOARD_CONFIG } from "../utils/types";

interface DashboardHeaderProps {
  area: DashboardArea;
  period: DashboardPeriod;
  onPeriodChange: (period: DashboardPeriod) => void;
}

export function DashboardHeader({ area, period, onPeriodChange }: DashboardHeaderProps) {
  const config = DASHBOARD_CONFIG[area];

  const iconMap = {
    purchase: <ShoppingCart className="size-3.5" />,
    sales: <BadgePercent className="size-3.5" />,
  };

  const periodOptions: { value: DashboardPeriod; label: string }[] = [
    { value: "week", label: "Last 7 Days" },
    { value: "month", label: "Last 30 Days" },
    { value: "year", label: "Last 12 Months" },
    { value: "all", label: "All Time" },
  ];

  const colorVariants = {
    blue: "text-blue-600 border-blue-200/50 bg-blue-50/50",
    indigo: "text-indigo-600 border-indigo-200/50 bg-indigo-50/50",
  };

  return (
    <div className="border-b border-zinc-200 bg-white/80 backdrop-blur-md px-6 py-4 shrink-0 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      {/* Left side: Breadcrumb & Title */}
      <div className="flex flex-col gap-2">
        <nav className="flex items-center gap-2" aria-label="Breadcrumb">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50/50 px-3 py-1 text-[11px] font-medium text-zinc-500 shadow-sm">
            <span>Home</span>
            <ChevronRight className="size-3 text-zinc-400" />
            <span>Dashboard</span>
            <ChevronRight className="size-3 text-zinc-400" />
            <span
              className={`inline-flex items-center gap-1 font-bold rounded px-1.5 py-0.5 border ${colorVariants[config.accentColor]}`}
            >
              {iconMap[area]}
              {area.charAt(0).toUpperCase() + area.slice(1)}
            </span>
          </div>
        </nav>
        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-zinc-900">
          {config.title}
        </h1>
      </div>

      {/* Right side: Period Selector */}
      <div className="flex items-center gap-2.5">
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
          <Calendar className="size-3.5 text-zinc-400" />
          Time Period
        </span>
        <div className="relative">
          <select
            id="period-select"
            value={period}
            onChange={(e) => onPeriodChange(e.target.value as DashboardPeriod)}
            className="appearance-none cursor-pointer rounded-xl border border-zinc-200 bg-white px-4 py-2 pr-10 text-sm font-semibold text-zinc-700 shadow-sm transition-all hover:bg-zinc-50 hover:border-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-400/20 focus:border-zinc-400"
          >
            {periodOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-zinc-400">
            <svg
              className="fill-current h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
            >
              <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
