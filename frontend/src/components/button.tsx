import { Loader2 } from "lucide-react";
import React from "react";

import type { ButtonProps } from "@/components/types/button.types";
import { cn } from "@/shared/utils/cn";

// Button: Industrial-grade action component with premium sapphire aesthetics.
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = "primary", size = "md", isLoading, loadingText, children, ...props },
    ref,
  ) => {
    const variants = {
      // BRAND: High-contrast primary action
      primary: "bg-ink-900 text-surface hover:bg-ink-800 shadow-sm focus:ring-ink-900/20",
      // NEUTRAL: Subtle secondary actions
      secondary: "bg-linen-100 text-ink-900 hover:bg-linen-200 focus:ring-linen-200/50",
      // SURGICAL: Interactive borders for clean layouts
      outline:
        "border border-linen-200 bg-transparent text-ink-900 hover:bg-linen-50 focus:ring-linen-100",
      // MINIMAL: Background-less utility actions
      ghost:
        "bg-transparent text-neutral-500 hover:bg-linen-50 hover:text-ink-900 focus:ring-linen-100",
      // DESTRUCTIVE: Critical warnings/deletions
      danger: "bg-red-600 text-surface hover:bg-red-700 focus:ring-red-600/20",
    };

    const sizes = {
      icon: "size-12 rounded-xl flex items-center justify-center p-0",
      lg: "h-14 px-8 text-base",
      md: "h-12 px-6 text-sm",
      sm: "h-9 px-3 text-xs",
    };

    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-xl font-bold uppercase tracking-[0.15em] transition-all duration-300",
          "focus:outline-none focus:ring-4 ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed select-none cursor-pointer active:scale-[0.98]",
          variants[variant],
          sizes[size],
          className,
        )}
        disabled={isLoading || props.disabled}
        {...props}
      >
        {isLoading ? (
          <span className="inline-flex items-center justify-center gap-1.5">
            <Loader2 className="h-4 w-4 animate-spin" />
            {loadingText || children}
          </span>
        ) : (
          children
        )}
      </button>
    );
  },
);

Button.displayName = "Button";
