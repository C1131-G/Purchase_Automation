import { motion, AnimatePresence } from "motion/react";
import { useIsFetching } from "@tanstack/react-query";
import { dashboardKeys } from "../queries/queryKeys";

interface DashboardSwitchBarProps {
  color: "blue" | "indigo";
}

export function DashboardSwitchBar({ color }: DashboardSwitchBarProps) {
  const isFetching = useIsFetching({ queryKey: dashboardKeys.all }) > 0;

  const bgClasses = {
    blue: "bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.5)]",
    indigo: "bg-indigo-600 shadow-[0_0_8px_rgba(79,70,229,0.5)]",
  };

  return (
    <div className="relative h-1 w-full bg-zinc-100 overflow-hidden shrink-0">
      <AnimatePresence>
        {isFetching && (
          <motion.div
            initial={{ left: "-100%" }}
            animate={{ left: "100%" }}
            exit={{ opacity: 0 }}
            transition={{
              repeat: Infinity,
              duration: 1.5,
              ease: "easeInOut",
            }}
            className={`absolute top-0 bottom-0 w-1/3 ${bgClasses[color]}`}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
