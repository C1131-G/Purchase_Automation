import { motion } from "motion/react";
import type { Variants } from "motion/react";
import type { DashboardMetric } from "../utils/types";
import { formatPercent, formatNumber } from "../utils/formatters";
import { dashboardVariants, springTransitions } from "../utils/motion";

interface ModuleTilesProps {
  metrics: DashboardMetric[] | undefined;
  currency: string;
}

export function ModuleTiles({ metrics, currency }: ModuleTilesProps) {
  if (!metrics || metrics.length === 0) return null;

  return (
    <motion.div
      variants={dashboardVariants.staggerChildren as Variants}
      initial="initial"
      animate="animate"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
    >
      {metrics.map((metric) => {
        return (
          <motion.div
            key={metric.key}
            variants={dashboardVariants.fadeInScale as Variants}
            transition={springTransitions.gentle}
            className="bg-white border border-zinc-200/60 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-start min-h-[155px] group relative overflow-hidden"
          >
            {/* Hover blue tint gradients */}
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.14),transparent_48%)] opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-blue-500/0 via-blue-500/55 to-blue-500/0 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />

            {/* Top section: Label */}
            <div className="relative">
              <span className="text-[13px] font-medium text-zinc-500 uppercase tracking-wider select-none block">
                {metric.label}
              </span>
            </div>

            {/* Value metrics - positioned directly below the label */}
            <div className="mt-6 flex items-baseline select-none relative">
              {metric.format === "currency" && (
                <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider mr-1.5 align-baseline transition-colors group-hover:text-blue-500">
                  {currency}
                </span>
              )}
              <span className="text-4xl font-semibold tracking-tight text-zinc-950 font-sans align-baseline">
                {metric.format === "currency"
                  ? formatNumber(metric.value)
                  : metric.format === "percent"
                    ? formatPercent(metric.value, 1)
                    : formatNumber(metric.value)}
              </span>
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
