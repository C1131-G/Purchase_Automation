import { memo, useMemo } from "react";
import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import type { Variants } from "motion/react";
import type { DashboardModuleCard } from "../utils/types";
import { dashboardVariants, springTransitions } from "../utils/motion";

interface ModuleCardsProps {
  modules: DashboardModuleCard[] | undefined;
  currency: string;
}

function formatCurrencyParts(value: number, currency: string) {
  try {
    const formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      notation: "compact",
      maximumFractionDigits: 0,
    });
    const parts = formatter.formatToParts(value);
    const amount = parts
      .filter((part) => part.type !== "currency" && part.type !== "literal")
      .map((part) => part.value)
      .join("")
      .trim();
    return {
      amount,
      currencyCode: currency.trim() || null,
    };
  } catch {
    const compactValue = new Intl.NumberFormat("en-US", {
      notation: "compact",
      maximumFractionDigits: 0,
    }).format(value);
    return {
      amount: compactValue,
      currencyCode: currency.trim() || null,
    };
  }
}

export const ModuleCards = memo(function ModuleCards({ modules, currency }: ModuleCardsProps) {
  if (!modules || modules.length === 0) return null;

  const formattedModules = useMemo(
    () =>
      modules.map((mod) => ({
        ...mod,
        openValueFormatted: formatCurrencyParts(mod.openValue, currency),
        totalValueFormatted: formatCurrencyParts(mod.totalValue, currency),
      })),
    [modules, currency],
  );

  return (
    <motion.div
      variants={dashboardVariants.staggerChildren as Variants}
      initial="initial"
      animate="animate"
      className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
    >
      {formattedModules.map((mod) => {
        const openValue = mod.openValueFormatted;
        const totalValue = mod.totalValueFormatted;

        return (
          <motion.div
            key={mod.key}
            variants={dashboardVariants.fadeInScale as Variants}
            transition={springTransitions.gentle}
            whileHover={{
              y: -3,
              boxShadow:
                "0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.025)",
            }}
            className="group relative flex flex-col overflow-hidden rounded-xl border border-zinc-200/90 bg-white p-5 shadow-sm cursor-pointer"
          >
            <div className="absolute inset-y-0 left-0 w-[3px] bg-blue-600 opacity-0 transition-opacity duration-150 group-hover:opacity-100" />

            <div className="flex justify-between items-start mb-4">
              <h3 className="font-semibold text-zinc-900 group-hover:text-blue-700 transition-colors">
                {mod.label}
              </h3>
              <motion.div
                whileHover={{ x: 3, opacity: 1 }}
                transition={{ duration: 0.15 }}
                className="opacity-60 group-hover:opacity-100"
              >
                <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-blue-500" />
              </motion.div>
            </div>

            <div className="grid grid-cols-2 gap-y-3 gap-x-6">
              <div>
                <div className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">
                  Open Value
                </div>
                <div className="mt-1 flex items-baseline gap-1 text-zinc-900">
                  {openValue.currencyCode ? (
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                      {openValue.currencyCode}
                    </span>
                  ) : null}
                  <span className="text-lg font-semibold tracking-tight">{openValue.amount}</span>
                </div>
              </div>
              <div>
                <div className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">
                  Total Value
                </div>
                <div className="mt-1 flex items-baseline gap-1 text-zinc-600">
                  {totalValue.currencyCode ? (
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                      {totalValue.currencyCode}
                    </span>
                  ) : null}
                  <span className="text-lg font-medium tracking-tight">{totalValue.amount}</span>
                </div>
              </div>
              <div>
                <div className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">
                  Open Docs
                </div>
                <div className="mt-1 text-sm font-medium text-zinc-700">{mod.openCount}</div>
              </div>
              <div>
                <div className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">
                  Total Docs
                </div>
                <div className="mt-1 text-sm font-medium text-zinc-700">{mod.documentCount}</div>
              </div>
            </div>

            <a href={mod.href} className="absolute inset-0" aria-label={mod.label} />
          </motion.div>
        );
      })}
    </motion.div>
  );
});
