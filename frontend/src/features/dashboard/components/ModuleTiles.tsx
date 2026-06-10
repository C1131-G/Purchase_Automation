import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import type { Variants } from "motion/react";
import type { DashboardModuleCard } from "../utils/types";
import { formatCurrency, formatTrend, formatNumber } from "../utils/formatters";
import { dashboardVariants, springTransitions } from "../utils/motion";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

interface ModuleTilesProps {
  cards: DashboardModuleCard[] | undefined;
  currency: string;
  color: "blue" | "indigo";
}

export function ModuleTiles({ cards, currency, color }: ModuleTilesProps) {
  if (!cards || cards.length === 0) return null;

  const accentRing = {
    blue: "hover:border-blue-400 focus-within:ring-blue-100",
    indigo: "hover:border-indigo-400 focus-within:ring-indigo-100",
  };

  const badgeColor = {
    blue: "text-blue-600 bg-blue-50 border-blue-100/50",
    indigo: "text-indigo-600 bg-indigo-50 border-indigo-100/50",
  };

  return (
    <motion.div
      variants={dashboardVariants.staggerChildren as Variants}
      initial="initial"
      animate="animate"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
    >
      {cards.map((card) => {
        const trend = formatTrend(card.trendPct);
        const hasTrend = card.trendPct !== 0;

        return (
          <motion.div
            key={card.key}
            variants={dashboardVariants.fadeInScale as Variants}
            transition={springTransitions.gentle}
            className={`bg-white border border-zinc-200/60 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between min-h-[160px] group relative focus-within:ring-4 ${accentRing[color]}`}
          >
            {/* Header: Title and Trend */}
            <div className="flex justify-between items-start gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-sm font-bold text-zinc-900 group-hover:text-zinc-950 transition-colors">
                  {card.label}
                </span>
                <span className="text-xs text-zinc-400 font-medium">
                  {formatNumber(card.documentCount)}{" "}
                  {card.documentCount === 1 ? "document" : "documents"}
                </span>
              </div>

              {hasTrend && (
                <div
                  className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-bold border transition-colors ${
                    trend.isPositive
                      ? "text-emerald-700 bg-emerald-50 border-emerald-100"
                      : "text-rose-700 bg-rose-50 border-rose-100"
                  }`}
                >
                  {trend.isPositive ? (
                    <ArrowUpRight className="size-3 stroke-[2.5]" />
                  ) : (
                    <ArrowDownRight className="size-3 stroke-[2.5]" />
                  )}
                  {trend.text}
                </div>
              )}
            </div>

            {/* Bottom section: Value metrics */}
            <div className="mt-5 pt-4 border-t border-zinc-100 flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-xs text-zinc-400 font-medium">Total Value</span>
                <span className="text-base font-bold text-zinc-900">
                  {formatCurrency(card.totalValue, currency, true)}
                </span>
              </div>

              {card.openCount > 0 && (
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-xs text-zinc-400 font-medium">Open Outstanding</span>
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-bold rounded-md px-1.5 py-0.5 border ${badgeColor[color]}`}
                  >
                    {card.openCount} open ({formatCurrency(card.openValue, currency, true)})
                  </span>
                </div>
              )}
            </div>

            {/* Native clickable Link overlay */}
            <Link
              to={card.href}
              className="absolute inset-0 rounded-2xl focus:outline-none"
              aria-label={`View details for ${card.label}`}
            />
          </motion.div>
        );
      })}
    </motion.div>
  );
}
