import type { GoeyToasterProps } from "goey-toast";

/**
 * GOEY_TOASTER_CONFIG: Branding and behavior overrides for the global notification system.
 * UX: Optimized for bottom-center feedback with snappy durations and subtle easing.
 */
export const GOEY_TOASTER_CONFIG: GoeyToasterProps = {
  bounce: 0.2,
  duration: 2000,
  position: "bottom-center",
  toastOptions: {
    classNames: {
      description: "truncate line-clamp-1",
    },
  },
};

export const GOEY_LOGIN_TOAST_DURATION = 2000;
