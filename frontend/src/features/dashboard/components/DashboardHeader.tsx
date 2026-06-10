import { Calendar, ChevronDown } from "lucide-react";
import type { DashboardPeriod, DashboardArea } from "../utils/types";
import { DASHBOARD_CONFIG } from "../utils/types";
import { Select } from "@/components/select/select";

interface DashboardHeaderProps {
  area: DashboardArea;
  period: DashboardPeriod;
  onPeriodChange: (period: DashboardPeriod) => void;
}

export function DashboardHeader({ area, period, onPeriodChange }: DashboardHeaderProps) {
  const config = DASHBOARD_CONFIG[area];

  const periodOptions: { value: DashboardPeriod; label: string }[] = [
    { value: "week", label: "One Week" },
    { value: "month", label: "One Month" },
    { value: "year", label: "One Year" },
    { value: "all", label: "All Time" },
  ];

  return (
    <div className="border-b border-zinc-200 bg-white/80 backdrop-blur-md px-6 py-4 shrink-0 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      {/* Left side: Title */}
      <div className="flex flex-col gap-1">
        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-zinc-900">
          {config.title}
        </h1>
      </div>

      {/* Right side: Period Selector */}
      <div className="flex items-center gap-2.5">
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5 select-none">
          <Calendar className="size-3.5 text-zinc-400" />
          Time Period
        </span>
        <div className="relative">
          <Select value={period} onValueChange={(val) => onPeriodChange(val as DashboardPeriod)}>
            <Select.Trigger className="border-zinc-200 bg-white hover:bg-white hover:border-zinc-300 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white min-w-[140px] px-3.5 py-2">
              <div className="flex items-center gap-2 overflow-hidden flex-1 select-none">
                <div className="truncate text-left font-semibold text-sm text-zinc-700">
                  <Select.Value />
                </div>
              </div>
              <Select.Icon>
                <ChevronDown className="size-4 text-zinc-400" />
              </Select.Icon>
            </Select.Trigger>
            <Select.Portal>
              <Select.Positioner>
                <Select.Popup>
                  <Select.List>
                    {periodOptions.map((opt) => (
                      <Select.Item key={opt.value} value={opt.value} label={opt.label}>
                        <span className="font-semibold text-[13px] text-zinc-800 py-1 block">
                          {opt.label}
                        </span>
                      </Select.Item>
                    ))}
                  </Select.List>
                </Select.Popup>
              </Select.Positioner>
            </Select.Portal>
          </Select>
        </div>
      </div>
    </div>
  );
}
