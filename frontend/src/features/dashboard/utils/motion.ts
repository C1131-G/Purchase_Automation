import type { Transition, Variants } from "motion/react";

export const springTransitions = {
  default: { type: "spring", stiffness: 300, damping: 30 } satisfies Transition,
  gentle: { type: "spring", stiffness: 180, damping: 24 } satisfies Transition,
  stiff: { type: "spring", stiffness: 500, damping: 25 } satisfies Transition,
};

export const dashboardVariants = {
  fadeIn: {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -12 },
  },
  fadeInScale: {
    initial: { opacity: 0, scale: 0.96, y: 8 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.96, y: -8 },
  },
  staggerChildren: {
    animate: {
      transition: {
        staggerChildren: 0.04,
      },
    },
  },
} satisfies Record<string, Variants>;
