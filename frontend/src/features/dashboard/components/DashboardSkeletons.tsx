import type { DashboardArea, DashboardPeriod } from "../utils/types";
import { Users, Search, TrendingUp, AlertCircle } from "lucide-react";

export function KpiRowSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="bg-white border border-zinc-200/60 rounded-2xl p-5 shadow-sm flex flex-col gap-2.5 animate-pulse"
        >
          <div className="h-3.5 w-24 bg-zinc-200 rounded-md" />
          <div className="h-7 w-36 bg-zinc-200 rounded-md" />
        </div>
      ))}
    </div>
  );
}

export function ModuleTilesSkeleton({ area }: { area: DashboardArea }) {
  const count = area === "purchase" ? 12 : area === "sales" ? 10 : 8;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white border border-zinc-200/60 rounded-2xl p-6 shadow-sm flex flex-col justify-start min-h-[155px] animate-pulse"
        >
          <div className="h-3.5 w-32 bg-zinc-200 rounded-md" />
          <div className="h-9 w-20 bg-zinc-200 rounded-md mt-6" />
        </div>
      ))}
    </div>
  );
}

export function ModuleCardsSkeleton({ area }: { area: DashboardArea }) {
  const count = area === "purchase" ? 6 : 5;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-zinc-200/90 bg-white p-5 shadow-sm animate-pulse flex flex-col"
        >
          <div className="flex items-start justify-between">
            <div className="h-5 w-32 bg-zinc-200 rounded-md" />
            <div className="size-4 bg-zinc-150 rounded shrink-0" />
          </div>
          <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3">
            {[1, 2, 3, 4].map((statIndex) => (
              <div key={statIndex} className="flex flex-col gap-1.5">
                <div className="h-3 w-16 bg-zinc-100 rounded-md" />
                <div className="h-5 w-24 bg-zinc-200 rounded-md mt-0.5" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function TrendChartSkeleton({
  area,
  period,
}: {
  area: DashboardArea;
  period: DashboardPeriod;
}) {
  const title = area === "purchase" ? "Purchase Flow Trend" : "Sales Flow Trend";
  const granularity = period === "week" ? "day" : "month";
  return (
    <div className="bg-white border border-zinc-200/60 rounded-2xl p-6 shadow-sm flex flex-col gap-4 h-full min-h-[380px] animate-pulse">
      <div className="flex flex-col gap-1">
        <h3 className="text-base font-bold text-zinc-900">{title}</h3>
        <p className="text-xs text-zinc-400 font-medium">
          Aggregated transaction values by {granularity}
        </p>
      </div>
      <div className="flex-1 w-full bg-zinc-50/50 border border-zinc-100 rounded-xl flex items-end justify-between p-4 gap-3">
        {[20, 40, 60, 30, 80, 50, 70, 45, 90, 60, 40, 75].map((h, i) => (
          <div key={i} style={{ height: `${h}%` }} className="w-full bg-zinc-200/50 rounded-t-md" />
        ))}
      </div>
    </div>
  );
}

export function FunnelChartSkeleton({
  area,
  period,
}: {
  area: DashboardArea;
  period: DashboardPeriod;
}) {
  const steps =
    area === "purchase"
      ? ["Purchase Quotation", "Purchase Order", "GRPO", "AP Invoice", "Outgoing Payment"]
      : ["Sales Quotation", "Sales Order", "AR Invoice", "Incoming Payment"];

  const color = area === "purchase" ? "blue" : "indigo";
  const periodLabel =
    period === "week"
      ? "This Week"
      : period === "month"
        ? "This Month"
        : period === "year"
          ? "This Year"
          : "All Time";

  return (
    <div className="bg-white border border-zinc-200/60 rounded-2xl p-6 shadow-sm flex flex-col gap-4 h-full animate-pulse">
      {/* Header */}
      <div className="flex flex-col gap-0.5 pb-2">
        <h3 className="text-base font-bold text-zinc-900">Process Flow</h3>
        <p className="text-xs font-medium text-zinc-400">
          Stage progression —{" "}
          <span
            className={`font-semibold ${color === "blue" ? "text-blue-500" : "text-indigo-500"}`}
          >
            {periodLabel}
          </span>
        </p>
      </div>

      {/* Flow list */}
      <div className="flex flex-col gap-0 flex-1 justify-center">
        {steps.map((label, index) => {
          const isLast = index === steps.length - 1;

          return (
            <div key={label} className="flex flex-col">
              {/* Step row */}
              <div className="flex items-center justify-between py-3 px-1">
                {/* Left: label */}
                <span className="text-sm font-semibold text-zinc-800">{label}</span>

                {/* Right: docs + value placeholders */}
                <span className="flex items-center gap-3 shrink-0">
                  <span className="h-3.5 w-12 bg-zinc-100 rounded-md" />
                  <span className="h-4 w-16 bg-zinc-200 rounded-md" />
                </span>
              </div>

              {/* Conversion arrow row between steps */}
              {!isLast && (
                <div className="flex items-center gap-2 pl-2 py-1">
                  <div className="h-5 w-12 bg-zinc-50 border border-zinc-200/50 rounded-full" />
                  <div className="flex-1 h-px bg-zinc-100" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function PartnerTableSkeleton({ area }: { area: DashboardArea }) {
  const tabs =
    area === "purchase"
      ? [
          "Top Vendors by PQ Value",
          "Top Vendors by PO Value",
          "Top Vendors by AP Invoice Value",
          "Top Vendors by Payment Value",
          "Memo Impact by Vendor",
        ]
      : [
          "Top Customers by Sales Quotation Value",
          "Top Customers by Sales Order Value",
          "Top Customers by AR Invoice Value",
          "Top Customers by Collection Value",
        ];

  return (
    <div className="bg-white border border-zinc-200/60 rounded-2xl p-6 shadow-sm flex flex-col gap-6 w-full animate-pulse">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-zinc-100 pb-5">
        <div className="flex items-center gap-3">
          <Users className="size-5 text-zinc-300 shrink-0" />
          <div className="flex flex-col gap-0.5">
            <h3 className="text-base font-bold text-zinc-950 leading-tight">Partner Analytics</h3>
            <p className="text-xs text-zinc-400 font-medium max-w-none">
              Top business partners sorted by cumulative volume and open exposure
            </p>
          </div>
        </div>

        {/* Tabs capsule */}
        <div className="flex bg-zinc-100/60 p-1 rounded-2xl border border-zinc-200/40 gap-1 shrink-0 max-w-full overflow-hidden">
          {tabs.map((tab, idx) => {
            const isActive = idx === 0;
            return (
              <button
                key={tab}
                disabled
                className={`text-center rounded-lg px-3 py-1.5 text-[11px] font-semibold tracking-tight border border-transparent whitespace-nowrap select-none cursor-not-allowed ${
                  isActive
                    ? "bg-white text-zinc-950 shadow-[0_1.5px_4px_rgba(0,0,0,0.06)] border-zinc-200/50"
                    : "text-zinc-400"
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] xl:grid-cols-[320px_1fr] gap-8 items-start">
        {/* Left Side: Stats and Search */}
        <div className="flex flex-col gap-6 border-b lg:border-b-0 lg:border-r border-zinc-100 pb-6 lg:pb-0 lg:pr-8">
          {/* Search bar */}
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-300" />
            <input
              type="text"
              placeholder="Search partner or code..."
              disabled
              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl pl-9 pr-8 py-2 text-xs font-medium text-zinc-400 cursor-not-allowed"
            />
          </div>

          {/* Key Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-zinc-50/50 border border-zinc-200/60 rounded-xl p-3.5 flex flex-col gap-0.5 shadow-2xs">
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                Total Volume
              </span>
              <div className="h-4.5 w-20 bg-zinc-200 rounded-md mt-1" />
            </div>
            <div className="bg-zinc-50/50 border border-zinc-200/60 rounded-xl p-3.5 flex flex-col gap-0.5 shadow-2xs">
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                Open Exposure
              </span>
              <div className="h-4.5 w-20 bg-zinc-200 rounded-md mt-1" />
            </div>
          </div>

          {/* Top Performers */}
          <div className="flex flex-col gap-3">
            <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <TrendingUp className="size-3.5 text-zinc-300" />
              Top Performers
            </h4>
            <div className="flex flex-col gap-2.5">
              {[1, 2, 3].map((idx) => {
                const medalBg =
                  idx === 1
                    ? "bg-amber-50/40 border-amber-200/70 text-amber-800"
                    : idx === 2
                      ? "bg-zinc-50/70 border-zinc-200 text-zinc-700"
                      : "bg-orange-50/40 border-orange-200/70 text-orange-800";
                return (
                  <div
                    key={idx}
                    className={`flex items-center gap-3 border rounded-xl p-3 shadow-2xs ${medalBg}`}
                  >
                    <span className="text-xs font-black size-5.5 rounded-full bg-white flex items-center justify-center shadow-2xs shrink-0">
                      {idx}
                    </span>
                    <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                      <div className="h-3.5 w-24 bg-zinc-200 rounded-md" />
                      <div className="h-2.5 w-12 bg-zinc-100 rounded-md" />
                    </div>
                    <div className="h-3.5 w-16 bg-zinc-200 rounded-md shrink-0" />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Side: Main Table */}
        <div className="w-full overflow-hidden min-h-[385px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-100 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                <th className="py-3 px-3 w-14 text-center">Rank</th>
                <th className="py-3 px-3">Business Partner</th>
                <th className="py-3 px-3 text-right">Documents</th>
                <th className="py-3 px-3 text-right">Cumulative Value</th>
                <th className="py-3 px-3 text-right">Exposure</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-150/40">
              {[1, 2, 3, 4, 5].map((idx) => (
                <tr key={idx} className="text-xs">
                  {/* Rank Badge */}
                  <td className="py-4 px-3 text-center">
                    <span
                      className={`inline-flex items-center justify-center size-5.5 rounded-full text-[10px] font-bold shadow-2xs ${
                        idx === 1
                          ? "bg-amber-100 text-amber-800 border border-amber-200/50"
                          : idx === 2
                            ? "bg-zinc-200 text-zinc-700 border border-zinc-300/50"
                            : idx === 3
                              ? "bg-orange-100 text-orange-800 border border-orange-200/50"
                              : "bg-zinc-100 text-zinc-500 border border-zinc-150"
                      }`}
                    >
                      {idx}
                    </span>
                  </td>

                  {/* Partner Info */}
                  <td className="py-4 px-3">
                    <div className="flex items-center gap-3">
                      <div className="size-8.5 rounded-xl bg-zinc-200 shrink-0" />
                      <div className="flex flex-col gap-1.5 w-32">
                        <div className="h-3.5 bg-zinc-200 rounded-md w-full" />
                        <div className="h-2.5 bg-zinc-100 rounded-md w-2/3" />
                      </div>
                    </div>
                  </td>

                  {/* Document Count */}
                  <td className="py-4 px-3 text-right">
                    <div className="h-3.5 bg-zinc-100 rounded-md w-12 ml-auto" />
                  </td>

                  {/* Cumulative Value & visual progress bar */}
                  <td className="py-4 px-3 text-right">
                    <div className="flex flex-col items-end gap-1.5">
                      <div className="h-3.5 bg-zinc-200 rounded-md w-16" />
                      <div className="w-24 sm:w-32 h-1 bg-zinc-100 rounded-full" />
                    </div>
                  </td>

                  {/* Open Exposure */}
                  <td className="py-4 px-3 text-right">
                    <div className="h-3.5 bg-zinc-100 rounded-md w-16 ml-auto" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function ExceptionsTableSkeleton({ area }: { area: DashboardArea }) {
  const color = area === "purchase" ? "blue" : "indigo";
  const tabs =
    area === "purchase"
      ? ["Open Quotations", "Open Orders", "Pending Invoices", "Pending Payments", "Recent Memos"]
      : ["Open Quotations", "Open Orders", "Pending Payments", "Recent Memos"];

  return (
    <div className="bg-white border border-zinc-200/60 rounded-2xl p-6 shadow-sm flex flex-col gap-6 w-full animate-pulse">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-zinc-100 pb-5">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <AlertCircle className="size-5 text-zinc-300 shrink-0" />
          <div className="flex flex-col gap-0.5 min-w-0">
            <h3 className="text-base font-bold text-zinc-950 leading-tight whitespace-nowrap">
              Actionable Exceptions & Aging
            </h3>
            <p className="text-xs text-zinc-400 font-medium whitespace-nowrap">
              Identified bottlenecks and anomalies requiring attention or approval
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-zinc-100/60 p-1 rounded-2xl border border-zinc-200/40 gap-1 shrink-0 max-w-full overflow-hidden">
          {tabs.map((tab, idx) => {
            const isActive = idx === 0;
            return (
              <button
                key={tab}
                disabled
                className={`text-center rounded-lg px-3 py-1.5 text-[11px] font-semibold tracking-tight border border-transparent whitespace-nowrap select-none cursor-not-allowed ${
                  isActive
                    ? "bg-white text-zinc-950 shadow-[0_1.5px_4px_rgba(0,0,0,0.06)] border-zinc-200/50"
                    : "text-zinc-400"
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>
      </div>

      {/* Exception list - fixed to 5-value height */}
      <div className="min-h-[400px] flex flex-col gap-2.5 justify-start">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`bg-zinc-50/35 border-t border-r border-b border-zinc-200/50 border-l-[3px] rounded-r-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${
              color === "blue" ? "border-l-blue-200" : "border-l-indigo-200"
            }`}
          >
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <div className="h-4.5 w-32 bg-zinc-200 rounded-md" />
                <div className="h-3.5 w-20 bg-zinc-150 rounded-md" />
              </div>
              <div className="h-3.5 w-48 bg-zinc-200 rounded-md mt-1.5" />
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-5">
              <div className="flex flex-col items-end gap-1">
                <div className="h-3.5 w-20 bg-zinc-200 rounded-md" />
                <div className="h-3 w-16 bg-zinc-150 rounded-md mt-1" />
              </div>
              <div className="size-7 bg-zinc-100 border border-zinc-200 rounded-lg shrink-0" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
