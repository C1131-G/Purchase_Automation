import { ChevronDown } from "lucide-react";
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
    { value: "week", label: "This Week" },
    { value: "month", label: "This Month" },
    { value: "year", label: "This Year" },
    { value: "all", label: "All Time" },
  ];

  return (
    <div className="bg-white px-6 py-4 shrink-0 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      {/* Left side: Title */}
      <div className="flex flex-col gap-0.5">
        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-zinc-900">
          {config.title}
        </h1>
        <p className="text-xs md:text-sm text-zinc-500">
          Operational overview for the current period.
        </p>
      </div>

      {/* Right side: Period Selector */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-zinc-500 select-none">Period</span>
        <div className="relative">
          <Select value={period} onValueChange={(val) => onPeriodChange(val as DashboardPeriod)}>
            <Select.Trigger className="h-9 min-w-[130px] rounded-lg border-zinc-200 bg-white hover:bg-zinc-50/50 hover:border-zinc-300 focus:outline-none px-3.5 py-1.5">
              <div className="flex items-center gap-2 overflow-hidden flex-1 select-none">
                <div className="truncate text-left font-medium text-sm text-zinc-800">
                  <Select.Value
                    labelMap={{
                      week: "This Week",
                      month: "This Month",
                      year: "This Year",
                      all: "All Time",
                    }}
                  />
                </div>
              </div>
              <Select.Icon rotate={180}>
                <ChevronDown className="size-4 text-zinc-400" />
              </Select.Icon>
            </Select.Trigger>
            <Select.Portal>
              <Select.Positioner className="w-[140px] right-0">
                <Select.Popup className="rounded-xl border border-zinc-200/80 bg-white shadow-lg p-1.5">
                  <Select.List className="p-0 space-y-0.5">
                    {periodOptions.map((opt) => (
                      <Select.Item key={opt.value} value={opt.value} label={opt.label}>
                        <span className="font-medium text-[13px] text-zinc-800 block">
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
