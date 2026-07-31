import { useRouterState } from "@tanstack/react-router";

import { cn } from "@/shared/utils/cn";

/**
 * Thin top bar that appears immediately when a route load is pending.
 * Gives click feedback before the destination page paints (avoids "frozen" feel).
 */
export function NavigationProgress() {
  const isLoading = useRouterState({ select: (state) => state.isLoading });

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-0 top-0 z-50 h-0.5 overflow-hidden",
        isLoading ? "opacity-100" : "opacity-0 transition-opacity duration-200",
      )}
      aria-hidden
      role="presentation"
    >
      <div
        className={cn(
          "h-full w-full origin-left bg-gradient-to-r from-sky-500 via-blue-600 to-violet-500",
          isLoading ? "animate-nav-progress" : "scale-x-0",
        )}
      />
    </div>
  );
}
