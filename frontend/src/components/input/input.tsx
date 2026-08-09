import React from "react";

import type { InputProps } from "@/components/types/input.types";
import { cn } from "@/shared/utils/cn";

/**
 * Input: High-precision data entry field with sapphire-600 focus states.
 * THEME: Enforces uniform industrial sizing and industrial typography.
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, id, name, ...props }, ref) => {
    const autoId = React.useId();
    const resolvedId = id ?? autoId;
    const resolvedName = name ?? resolvedId;

    return (
      <input
        ref={ref}
        id={resolvedId}
        name={resolvedName}
        autoComplete="off"
        className={cn(
          "flex h-12 w-full rounded-xl border border-linen-200 bg-linen-50/50 px-4 text-sm text-ink-900 transition-all font-outfit",
          "placeholder:text-neutral-300",
          "focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent focus:bg-surface",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "ring-offset-1",
          className,
        )}
        {...props}
      />
    );
  },
);

Input.displayName = "Input";
