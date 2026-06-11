import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import type { Variants } from "motion/react";
import type { DashboardFunnelStep } from "../utils/types";
import { formatCurrency, formatNumber } from "../utils/formatters";
import { dashboardVariants, springTransitions } from "../utils/motion";
import { ArrowRight } from "lucide-react";

interface FunnelChartProps {
  steps: DashboardFunnelStep[] | undefined;
  currency: string;
  color: "blue" | "indigo";
  period?: string;
}

const colorAccent: Record<"blue" | "indigo", string> = {
  blue: "bg-blue-50 text-blue-600 border-blue-100",
  indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
};

const arrowColor: Record<"blue" | "indigo", string> = {
  blue: "text-blue-500",
  indigo: "text-indigo-500",
};

export function FunnelChart({ steps, currency, color, period }: FunnelChartProps) {
  if (!steps || steps.length === 0) return null;

  const accent = colorAccent[color];
  const arrow = arrowColor[color];

  const periodLabel =
    period === "week"
      ? "This Week"
      : period === "month"
        ? "This Month"
        : period === "year"
          ? "This Year"
          : "All Time";

  return (
    <div className="bg-white border border-zinc-200/60 rounded-2xl p-6 shadow-sm flex flex-col gap-4 h-full">
      {/* Header */}
      <div className="flex flex-col gap-0.5">
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
      <motion.div
        variants={dashboardVariants.staggerChildren as Variants}
        initial="initial"
        animate="animate"
        className="flex flex-col gap-0 flex-1"
      >
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;

          return (
            <motion.div
              key={step.key}
              variants={dashboardVariants.fadeInScale as Variants}
              transition={springTransitions.gentle}
              className="flex flex-col"
            >
              {/* Step row */}
              <Link
                to={step.href}
                className="group flex items-center justify-between py-3 px-1 rounded-xl hover:bg-zinc-50 transition-colors"
                aria-label={`View ${step.label}`}
              >
                {/* Left: label */}
                <span className="text-sm font-semibold text-zinc-800 group-hover:text-zinc-950 transition-colors">
                  {step.label}
                </span>

                {/* Right: docs + value */}
                <span className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-zinc-400 font-medium">
                    {formatNumber(step.documentCount)} docs
                  </span>
                  <span className="text-sm font-bold text-zinc-800 min-w-[48px] text-right">
                    {formatCurrency(step.totalValue, currency, true)}
                  </span>
                </span>
              </Link>

              {/* Conversion arrow row between steps */}
              {!isLast && (
                <div className="flex items-center gap-2 pl-2 py-1">
                  <div
                    className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${accent}`}
                  >
                    <ArrowRight className={`size-3 ${arrow}`} />
                    {index > 0
                      ? `${Math.round(step.conversionPct)}%`
                      : `${Math.round(steps[index + 1]?.conversionPct ?? 0)}%`}
                  </div>
                  {/* Connector line */}
                  <div className="flex-1 h-px bg-zinc-100" />
                </div>
              )}
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
