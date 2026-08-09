export const theme = {
  ink: {
    950: "#0a1628",
    900: "#0f1e2e",
    800: "#162a41",
    700: "#1d3557",
    600: "#244a6e",
    500: "#2d5a84",
  },
  teal: {
    50: "#e6f4f2",
    100: "#cce8e4",
    200: "#99d1c9",
    500: "#0f766e",
    600: "#0d665f",
    700: "#0a544e",
    900: "#083e39",
  },
  linen: {
    50: "#faf9f6",
    100: "#f6f5f0",
    200: "#ece9e0",
    300: "#ddd8c8",
  },
  surface: "#ffffff",
  neutral: {
    300: "#a8b0bb",
    400: "#8690a0",
    500: "#647082",
    600: "#4a5568",
  },
  semantic: {
    danger: "#dc2626",
    success: "#0f766e",
    warning: "#b45309",
    info: "#0e7490",
  },
} as const;

export const semantic = {
  surface: "bg-surface",
  page: "bg-linen-50",
  card: "bg-surface border-linen-200",
  border: "border-linen-200",
  text: "text-ink-900",
  muted: "text-neutral-500",
  brand: "bg-teal-500 text-surface hover:bg-teal-600",
  focus: "focus:ring-teal-500/15 focus:border-teal-500",
} as const;
