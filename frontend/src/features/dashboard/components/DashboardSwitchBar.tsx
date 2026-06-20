import { motion, AnimatePresence } from "motion/react";
import type { DashboardArea } from "../utils/types";

interface DashboardSwitchBarProps {
  isSwitchLoading: boolean;
  area: DashboardArea;
}

const BAR_COLOR = {
  purchase: "#2563eb", // blue-600
  sales: "#4f46e5", // indigo-600
  inventory: "#2563eb", // blue-600
};

export function DashboardSwitchBar({ isSwitchLoading, area }: DashboardSwitchBarProps) {
  const color = BAR_COLOR[area];

  return (
    <AnimatePresence>
      {isSwitchLoading && (
        <motion.div
          key="bar-wrap"
          className="relative h-[5px] w-full shrink-0 overflow-hidden z-50 bg-zinc-100/30"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            style={{
              height: "100%",
              backgroundColor: color,
            }}
            initial={{ width: "0%", left: 0, position: "absolute" }}
            animate={{
              width: [
                "0%", // Start
                "30%", // ~5s - quick start
                "80%", // ~15s - fast phase complete
                "100%", // Remaining time - slow completion
              ],
            }}
            transition={{
              times: [0, 0.125, 0.375, 1],
              duration: 40,
              ease: "linear",
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
