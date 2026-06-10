import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { DashboardPartnerGroup } from "../utils/types";
import { formatCurrency, formatNumber } from "../utils/formatters";
import { Users } from "lucide-react";

interface PartnerTableProps {
  groups: DashboardPartnerGroup[] | undefined;
  currency: string;
  color: "blue" | "indigo";
}

export function PartnerTable({ groups, currency, color }: PartnerTableProps) {
  const [activeTab, setActiveTab] = useState(0);

  if (!groups || groups.length === 0) return null;

  const activeGroup = groups[activeTab] ?? groups[0];
  if (!activeGroup) return null;

  const maxVal = Math.max(...activeGroup.entries.map((e) => e.totalValue), 1);

  const progressColor = {
    blue: "bg-blue-500/10 border-blue-500/20",
    indigo: "bg-indigo-500/10 border-indigo-500/20",
  };

  return (
    <div className="bg-white border border-zinc-200/60 rounded-2xl p-6 shadow-sm flex flex-col gap-6">
      {/* Header and Title */}
      <div className="flex flex-col gap-1.5">
        <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
          <Users className="size-4.5 text-zinc-400" />
          Partner Analytics (Pareto)
        </h3>
        <p className="text-xs text-zinc-400 font-medium">
          Top business partners sorted by cumulative volume and open exposure
        </p>
      </div>

      {/* Dynamic Tab Switcher */}
      <div className="flex flex-wrap gap-1.5 bg-zinc-100/75 p-1 rounded-xl border border-zinc-200/40 shrink-0">
        {groups.map((group, idx) => {
          const isActive = idx === activeTab;
          return (
            <button
              key={group.key}
              onClick={() => setActiveTab(idx)}
              className={`flex-1 min-w-[140px] text-center rounded-lg px-3 py-1.5 text-xs font-semibold tracking-tight transition-all cursor-pointer select-none ${
                isActive
                  ? "bg-white text-zinc-900 shadow-sm border border-zinc-200/40"
                  : "text-zinc-500 hover:text-zinc-800"
              }`}
            >
              {group.title}
            </button>
          );
        })}
      </div>

      {/* Table Section */}
      <div className="overflow-x-auto min-h-[280px]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-zinc-100 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              <th className="py-2.5 px-3 w-12 text-center">Rank</th>
              <th className="py-2.5 px-3">Partner</th>
              <th className="py-2.5 px-3 text-right">Docs</th>
              <th className="py-2.5 px-3 text-right">Total Value</th>
              <th className="py-2.5 px-3 text-right">Open Exposure</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence mode="wait">
              {activeGroup.entries.length === 0 ? (
                <tr className="text-center text-zinc-400 text-xs">
                  <td colSpan={5} className="py-12">
                    No partner data recorded for this period.
                  </td>
                </tr>
              ) : (
                activeGroup.entries.map((entry, idx) => {
                  const percentWidth = (entry.totalValue / maxVal) * 100;
                  return (
                    <motion.tr
                      key={entry.code}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.16, ease: "easeOut" }}
                      className="border-b border-zinc-100/60 hover:bg-zinc-50/50 transition-all text-xs group/row"
                    >
                      {/* Rank badge */}
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-flex items-center justify-center size-5 rounded-full text-[10px] font-bold ${
                            idx === 0
                              ? "bg-amber-100 text-amber-800"
                              : idx === 1
                                ? "bg-zinc-200 text-zinc-700"
                                : idx === 2
                                  ? "bg-orange-100 text-orange-800"
                                  : "bg-zinc-100 text-zinc-500"
                          }`}
                        >
                          {idx + 1}
                        </span>
                      </td>

                      {/* Name / Code */}
                      <td className="py-3 px-3">
                        <div className="flex flex-col max-w-[200px] md:max-w-[320px]">
                          <span className="font-bold text-zinc-950 truncate" title={entry.name}>
                            {entry.name}
                          </span>
                          <span className="text-[10px] font-semibold text-zinc-400 mt-0.5">
                            {entry.code}
                          </span>
                        </div>
                      </td>

                      {/* Doc Count */}
                      <td className="py-3 px-3 text-right font-medium text-zinc-500">
                        {formatNumber(entry.documentCount)}
                      </td>

                      {/* Total Value & Proportional Progress bar */}
                      <td className="py-3 px-3 text-right font-bold text-zinc-900 relative">
                        {/* Inline progress bar */}
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-28 md:w-36 overflow-hidden rounded-md border pointer-events-none opacity-0 group-hover/row:opacity-100 transition-all duration-300 flex items-center justify-end pr-2">
                          <div
                            style={{ width: `${percentWidth}%` }}
                            className={`absolute right-0 top-0 bottom-0 ${progressColor[color]}`}
                          />
                        </div>
                        <span className="relative z-10">
                          {formatCurrency(entry.totalValue, currency, false)}
                        </span>
                      </td>

                      {/* Open Value */}
                      <td className="py-3 px-3 text-right font-bold text-amber-600">
                        {entry.openValue > 0 ? (
                          formatCurrency(entry.openValue, currency, false)
                        ) : (
                          <span className="text-zinc-300">—</span>
                        )}
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </div>
  );
}
