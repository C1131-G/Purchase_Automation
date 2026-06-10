import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import type { Variants } from "motion/react";
import type { DashboardFunnelStep } from "../utils/types";
import { formatCurrency, formatPercent, formatNumber } from "../utils/formatters";
import { dashboardVariants, springTransitions } from "../utils/motion";
import { ArrowRight, ArrowDown } from "lucide-react";

interface FunnelChartProps {
  steps: DashboardFunnelStep[] | undefined;
  currency: string;
  color: "blue" | "indigo";
}

export function FunnelChart({ steps, currency, color }: FunnelChartProps) {
  if (!steps || steps.length === 0) return null;

  const colorConfig = {
    blue: {
      border: "border-blue-100 hover:border-blue-300",
      accent: "text-blue-600 bg-blue-50 border-blue-100",
      arrow: "text-blue-400 bg-blue-50 border-blue-100/50",
      glow: "hover:shadow-[0_8px_30px_rgb(239,246,255,0.7)]",
    },
    indigo: {
      border: "border-indigo-100 hover:border-indigo-300",
      accent: "text-indigo-600 bg-indigo-50 border-indigo-100",
      arrow: "text-indigo-400 bg-indigo-50 border-indigo-100/50",
      glow: "hover:shadow-[0_8px_30px_rgb(245,243,255,0.7)]",
    },
  };

  const activeColor = colorConfig[color];

  return (
    <div className="bg-white border border-zinc-200/60 rounded-2xl p-6 shadow-sm flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h3 className="text-base font-bold text-zinc-900">Process Conversion Funnel</h3>
          <p className="text-xs text-zinc-400 font-medium">
            Workflow flow rate and values across successive document stages
          </p>
        </div>
      </div>

      <motion.div
        variants={dashboardVariants.staggerChildren as Variants}
        initial="initial"
        animate="animate"
        className="flex flex-col lg:flex-row items-center gap-4 lg:gap-2"
      >
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;
          const showArrow = !isLast;

          return (
            <div
              key={step.key}
              className="flex-1 w-full flex flex-col lg:flex-row items-center gap-4 lg:gap-2"
            >
              {/* Funnel Card */}
              <motion.div
                variants={dashboardVariants.fadeInScale as Variants}
                transition={springTransitions.gentle}
                className={`flex-1 w-full bg-zinc-50/40 border rounded-2xl p-5 hover:bg-white transition-all duration-300 relative group flex flex-col justify-between min-h-[145px] ${activeColor.border} ${activeColor.glow}`}
              >
                <div>
                  <div className="flex items-start justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                      Step {index + 1}
                    </span>
                    {index > 0 && (
                      <span
                        className={`inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${activeColor.accent}`}
                      >
                        {formatPercent(step.conversionPct, 0)} conv.
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-zinc-900 mt-1.5">{step.label}</h4>
                </div>

                <div className="mt-4 flex flex-col gap-1">
                  <div className="flex justify-between text-xs text-zinc-500 font-semibold">
                    <span>Docs</span>
                    <span className="text-zinc-950 font-bold">
                      {formatNumber(step.documentCount)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-zinc-500 font-semibold">
                    <span>Total Value</span>
                    <span className="text-zinc-950 font-bold">
                      {formatCurrency(step.totalValue, currency, true)}
                    </span>
                  </div>
                  {step.openCount > 0 && (
                    <div className="flex justify-between text-[11px] text-zinc-400 font-semibold">
                      <span>Open Outstanding</span>
                      <span className="text-amber-600 font-bold">
                        {step.openCount} ({formatCurrency(step.openValue, currency, true)})
                      </span>
                    </div>
                  )}
                </div>

                {/* Clickable Overlay */}
                <Link
                  to={step.href}
                  className="absolute inset-0 rounded-2xl focus:outline-none"
                  aria-label={`View ${step.label} listing`}
                />
              </motion.div>

              {/* Connector Arrow */}
              {showArrow && (
                <div className="shrink-0 flex items-center justify-center p-1 lg:p-0">
                  {/* Arrow for large screens */}
                  <div className="hidden lg:flex items-center justify-center size-8 rounded-full border border-zinc-100 bg-zinc-50/50 text-zinc-400 group-hover:bg-zinc-100 transition-colors shadow-sm">
                    <ArrowRight className="size-4" />
                  </div>
                  {/* Arrow for small screens */}
                  <div className="lg:hidden flex items-center justify-center size-8 rounded-full border border-zinc-100 bg-zinc-50/50 text-zinc-400 shadow-sm">
                    <ArrowDown className="size-4" />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </motion.div>
    </div>
  );
}
