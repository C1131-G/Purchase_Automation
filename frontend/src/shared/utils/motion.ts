/** MOTION_MS: Unified animation durations (ms) for consistent UI transitions. */
export const MOTION_MS = {
  calendarAutoClose: 120,
  calendarCell: 160,
  calendarChevron: 180,
  calendarList: 140,
  calendarView: 200,
  popoverEnter: 160,
  popoverExit: 120,
  sidebarBackdrop: 200,
  sidebarContentFade: 150,
  sidebarOpenClose: 200,
} as const;

/** MOTION_EASING: Standardized CSS transition functions for smooth animations. */
export const MOTION_EASING = {
  smoothOut: "cubic-bezier(0.16, 1, 0.3, 1)",
} as const;
