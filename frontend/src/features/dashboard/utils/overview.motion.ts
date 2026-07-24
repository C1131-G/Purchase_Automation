/** Dashboard-local motion helpers — reuses app easing, opacity/transform only. */

import { MOTION_EASING } from "@/shared/utils/motion";

export const OVERVIEW_EASE = MOTION_EASING.smoothOut;

/** Stable transition string for press / enter (Tailwind arbitrary values). */
export const overviewTransition = {
  press: `transform 140ms ${OVERVIEW_EASE}`,
  enter: `opacity 200ms ${OVERVIEW_EASE}, transform 200ms ${OVERVIEW_EASE}`,
  filter: `opacity 160ms ${OVERVIEW_EASE}, transform 160ms ${OVERVIEW_EASE}`,
  color: `background-color 150ms ${OVERVIEW_EASE}, box-shadow 150ms ${OVERVIEW_EASE}, color 150ms ${OVERVIEW_EASE}`,
} as const;

/** CSS class names from overview.css */
export const overviewMotionClass = {
  enter: "overview-enter",
  empty: "overview-empty-enter",
  chipStagger: "overview-chip-stagger",
  filterSwap: "overview-filter-swap",
} as const;
