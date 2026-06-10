import { motion } from "motion/react";
import type { Variants } from "motion/react";
import type { DashboardMetric } from "../utils/types";
import { formatCurrency, formatPercent, formatNumber } from "../utils/formatters";
import { dashboardVariants, springTransitions } from "../utils/motion";
import { TrendingUp, DollarSign, FileText, CreditCard, CheckCircle2, Percent } from "lucide-react";

interface KpiRowProps {
  metrics: DashboardMetric[] | undefined;
  currency: string;
  color: "blue" | "indigo";
}

export function KpiRow({ metrics, currency, color }: KpiRowProps) {
  if (!metrics || metrics.length === 0) return null;

  const getIcon = (key: string) => {
    const iconClass = "size-5 text-zinc-500";
    if (key.includes("total") && !key.includes("credit") && !key.includes("invoice")) {
      return <DollarSign className={iconClass} />;
    }
    if (key.includes("open") || key.includes("active")) {
      return <FileText className={iconClass} />;
    }
    if (key.includes("conversion") || key.includes("coverage")) {
      return <Percent className={iconClass} />;
    }
    if (key.includes("invoice")) {
      return <FileText className={iconClass} />;
    }
    if (key.includes("payment")) {
      return <CreditCard className={iconClass} />;
    }
    return <CheckCircle2 className={iconClass} />;
  };

  const getCardBg = (key: string) => {
    if (key.includes("conversion") || key.includes("coverage")) {
      return color === "blue"
        ? "bg-gradient-to-br from-blue-50/40 to-indigo-50/20 border-blue-100"
        : "bg-gradient-to-br from-indigo-50/40 to-violet-50/20 border-indigo-100";
    }
    return "bg-white border-zinc-200/60";
  };

  return (
    <motion.div
      variants={dashboardVariants.staggerChildren as Variants}
      initial="initial"
      animate="animate"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-5"
    >
      {metrics.map((metric) => {
        const valueFormatted =
          metric.format === "currency"
            ? formatCurrency(metric.value, currency, false)
            : metric.format === "percent"
              ? formatPercent(metric.value, 1)
              : formatNumber(metric.value);

        return (
          <motion.div
            key={metric.key}
            variants={dashboardVariants.fadeInScale as Variants}
            transition={springTransitions.gentle}
            className={`border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between min-h-[110px] group ${getCardBg(
              metric.key,
            )}`}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                {metric.label}
              </span>
              <div className="p-2 bg-zinc-50 rounded-xl group-hover:scale-110 transition-transform duration-200 border border-zinc-100">
                {getIcon(metric.key)}
              </div>
            </div>
            <div className="mt-2.5 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-zinc-950 font-sans">
                {valueFormatted}
              </span>
              {metric.format === "percent" && metric.value > 0 && (
                <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">
                  <TrendingUp className="size-3" />
                  Active
                </span>
              )}
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
