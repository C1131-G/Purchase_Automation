import { useState } from "react";
import type { DashboardPartnerGroup } from "../utils/types";
import { formatCurrency, formatNumber } from "../utils/formatters";
import { Users, Search, X, TrendingUp } from "lucide-react";

interface PartnerTableProps {
  groups: DashboardPartnerGroup[] | undefined;
  currency: string;
  color: "blue" | "indigo";
}

export function PartnerTable({ groups, currency, color }: PartnerTableProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  if (!groups || groups.length === 0) return null;

  const activeGroup = groups[activeTab] ?? groups[0];
  if (!activeGroup) return null;

  // Cap entries to top 5
  const displayEntries = activeGroup.entries.slice(0, 5);

  // Filter entries based on search query
  const filteredEntries = displayEntries.filter(
    (entry) =>
      entry.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.code.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const maxVal = Math.max(...displayEntries.map((e) => e.totalValue), 1);
  const totalVolume = displayEntries.reduce((sum, e) => sum + e.totalValue, 0);
  const totalExposure = displayEntries.reduce((sum, e) => sum + e.openValue, 0);

  const top3 = filteredEntries.slice(0, 3);

  // Generates stable HSL background color based on name string
  const getAvatarColor = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash % 360);
    return `hsl(${h}, 70%, 93%)`;
  };

  // Generates stable HSL text color based on name string
  const getAvatarTextColor = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash % 360);
    return `hsl(${h}, 80%, 35%)`;
  };

  const getInitials = (name: string) => {
    if (!name) return "??";
    const parts = name.split(/\s+/).filter(Boolean);
    const first = parts[0];
    const second = parts[1];
    if (first && second) {
      const fChar = first[0];
      const sChar = second[0];
      if (fChar && sChar) {
        return (fChar + sChar).toUpperCase();
      }
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="bg-white border border-zinc-200/60 rounded-2xl p-6 shadow-sm flex flex-col gap-6 w-full">
      {/* Header and Title - Matched to reference image */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-zinc-100 pb-5">
        <div className="flex items-center gap-3">
          <Users className="size-5 text-zinc-400 shrink-0" />
          <div className="flex flex-col gap-0.5">
            <h3 className="text-base font-bold text-zinc-950 leading-tight">Partner Analytics</h3>
            <p className="text-xs text-zinc-400 font-medium max-w-none">
              Top business partners sorted by cumulative volume and open exposure
            </p>
          </div>
        </div>

        {/* Dynamic Tab Switcher - Capsule Pills matched to reference image */}
        <div className="flex bg-zinc-100/60 p-1 rounded-2xl border border-zinc-200/40 gap-1 shrink-0 max-w-full overflow-hidden">
          {groups.map((group, idx) => {
            const isActive = idx === activeTab;
            return (
              <button
                key={group.key}
                onClick={() => {
                  setActiveTab(idx);
                  setSearchQuery(""); // Clear search on tab switch
                }}
                className={`text-center rounded-lg px-3 py-1.5 text-[11px] font-semibold tracking-tight border border-transparent transition-colors duration-150 cursor-pointer whitespace-nowrap select-none ${
                  isActive
                    ? "bg-white text-zinc-950 shadow-[0_1.5px_4px_rgba(0,0,0,0.06)] border-zinc-200/50"
                    : "text-zinc-500 hover:text-zinc-800"
                }`}
              >
                {group.title}
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
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search partner or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl pl-9 pr-8 py-2 text-xs font-medium text-zinc-800 placeholder-zinc-400 focus:outline-none focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Key Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-zinc-50/50 border border-zinc-200/60 rounded-xl p-3.5 flex flex-col gap-0.5 shadow-2xs">
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                Total Volume
              </span>
              <span className="text-xs font-extrabold text-zinc-900 truncate">
                {formatCurrency(totalVolume, currency, true)}
              </span>
            </div>
            <div className="bg-zinc-50/50 border border-zinc-200/60 rounded-xl p-3.5 flex flex-col gap-0.5 shadow-2xs">
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                Open Exposure
              </span>
              <span className="text-xs font-extrabold text-amber-600 truncate">
                {formatCurrency(totalExposure, currency, true)}
              </span>
            </div>
          </div>

          {/* Top 3 Podium Highlights */}
          {top3.length > 0 && (
            <div className="flex flex-col gap-3">
              <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <TrendingUp className="size-3.5" />
                Top Performers
              </h4>
              <div className="flex flex-col gap-2.5">
                {top3.map((entry, idx) => {
                  const medalBg =
                    idx === 0
                      ? "bg-amber-50/40 border-amber-200/70 text-amber-800"
                      : idx === 1
                        ? "bg-zinc-50/70 border-zinc-200 text-zinc-700"
                        : "bg-orange-50/40 border-orange-200/70 text-orange-800";

                  return (
                    <div
                      key={entry.code}
                      className={`flex items-center gap-3 border rounded-xl p-3 shadow-2xs ${medalBg}`}
                    >
                      <span className="text-xs font-black size-5.5 rounded-full bg-white flex items-center justify-center shadow-2xs shrink-0">
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                        <span className="text-xs font-bold truncate text-zinc-950">
                          {entry.name}
                        </span>
                        <span className="text-[9px] font-semibold text-zinc-400 uppercase tracking-tight">
                          {entry.code}
                        </span>
                      </div>
                      <span className="text-xs font-extrabold text-zinc-950 whitespace-nowrap">
                        {formatCurrency(entry.totalValue, currency, true)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
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
              {filteredEntries.length === 0 ? (
                <tr className="text-center text-zinc-400 text-xs">
                  <td colSpan={5} className="py-16">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span className="text-sm font-bold text-zinc-800">No Partners Found</span>
                      <span className="text-xs text-zinc-400 font-medium">
                        Try modifying your search query.
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry, idx) => {
                  const percentWidth = (entry.totalValue / maxVal) * 100;
                  const avatarBg = getAvatarColor(entry.name);
                  const avatarText = getAvatarTextColor(entry.name);

                  return (
                    <tr
                      key={entry.code}
                      className="hover:bg-zinc-50/45 transition-all text-xs group/row"
                    >
                      {/* Rank Badge */}
                      <td className="py-4 px-3 text-center">
                        <span
                          className={`inline-flex items-center justify-center size-5.5 rounded-full text-[10px] font-bold shadow-2xs ${
                            idx === 0
                              ? "bg-amber-100 text-amber-800 border border-amber-200/50"
                              : idx === 1
                                ? "bg-zinc-200 text-zinc-700 border border-zinc-300/50"
                                : idx === 2
                                  ? "bg-orange-100 text-orange-800 border border-orange-200/50"
                                  : "bg-zinc-100 text-zinc-500 border border-zinc-150"
                          }`}
                        >
                          {idx + 1}
                        </span>
                      </td>

                      {/* Partner Name, Code and Avatar */}
                      <td className="py-4 px-3">
                        <div className="flex items-center gap-3">
                          {/* Avatar */}
                          <div
                            style={{ backgroundColor: avatarBg, color: avatarText }}
                            className="size-8.5 rounded-xl flex items-center justify-center text-[10px] font-extrabold shadow-3xs border border-zinc-200/20 shrink-0 select-none"
                          >
                            {getInitials(entry.name)}
                          </div>
                          <div className="flex flex-col min-w-0 max-w-[180px] sm:max-w-[280px] md:max-w-[360px] lg:max-w-[400px]">
                            <span className="font-bold text-zinc-950 truncate" title={entry.name}>
                              {entry.name}
                            </span>
                            <span className="text-[9px] font-semibold text-zinc-400 mt-0.5 tracking-wider uppercase">
                              {entry.code}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Document Count */}
                      <td className="py-4 px-3 text-right font-semibold text-zinc-500">
                        {formatNumber(entry.documentCount)} docs
                      </td>

                      {/* Cumulative Total Value & visual progress bar */}
                      <td className="py-4 px-3 text-right">
                        <div className="flex flex-col items-end gap-1.5">
                          <span className="font-extrabold text-zinc-950">
                            {formatCurrency(entry.totalValue, currency, false)}
                          </span>
                          <div className="w-24 sm:w-32 h-1 bg-zinc-100 rounded-full overflow-hidden shrink-0">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                color === "blue"
                                  ? "bg-gradient-to-r from-blue-400 to-blue-600"
                                  : "bg-gradient-to-r from-indigo-400 to-indigo-600"
                              }`}
                              style={{ width: `${percentWidth}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Open Exposure */}
                      <td className="py-4 px-3 text-right">
                        {entry.openValue > 0 ? (
                          <span className="inline-flex flex-col items-end gap-0.5">
                            <span className="font-extrabold text-rose-600">
                              {formatCurrency(entry.openValue, currency, false)}
                            </span>
                            <span className="text-[8px] font-bold text-rose-500 uppercase tracking-tight bg-rose-50 border border-rose-100 px-1 rounded">
                              Exposure
                            </span>
                          </span>
                        ) : (
                          <span className="text-zinc-300 font-semibold">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
