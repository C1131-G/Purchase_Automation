import { RefreshCcw, ServerCrash } from "lucide-react";

import { Button } from "@/components/button";
import { cn } from "@/shared/utils/cn";

/**
 * SectionErrorState: Standardized UI for handling component, container, or page-level failures.
 * Usage: Render inside a catch-block, a conditional error state, or as an ErrorBoundary fallback.
 */
interface SectionErrorStateProps {
  title?: string | undefined;
  message?: string | undefined;
  onRetry?: (() => void) | undefined;
  className?: string | undefined;
  variant?: "default" | "compact" | undefined;
}

/**
 * Universal error state component for sections, tables, or full pages.
 * Provides a premium, consistent error UI with optional retry logic.
 */
export function SectionErrorState({
  title = "Something went wrong",
  message = "Please check your connection or contact support if the problem persists.",
  onRetry,
  className,
  variant = "default",
}: SectionErrorStateProps) {
  // Compact Variant: Ideal for table rows, lookup popups, or narrow sidebars.
  if (variant === "compact") {
    return (
      <div
        className={cn(
          "flex flex-col items-center gap-3 rounded-xl border border-red-100 bg-red-50/60 px-4 py-5 text-center",
          className,
        )}
      >
        <div className="relative flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-red-50 to-orange-50 text-red-500 shadow-sm ring-1 ring-red-100/60">
          <div className="absolute inset-0 rounded-xl bg-red-500/5 blur-lg" />
          <ServerCrash className="relative size-5 stroke-[1.5]" />
        </div>
        <div className="space-y-0.5">
          <p className="text-xs font-semibold text-ink-900">{title}</p>
          <p className="text-[11px] leading-relaxed text-neutral-500">{message}</p>
        </div>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 rounded-lg border border-linen-200 bg-surface px-3 py-1.5 text-[11px] font-medium text-ink-900 shadow-sm transition hover:bg-linen-50 hover:text-ink-900"
          >
            <RefreshCcw className="size-3" />
            Try again
          </button>
        )}
      </div>
    );
  }

  // Default Variant: High-impact layout for full-page or large-section error states.
  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center bg-linen-50/50 px-4 py-12",
        className,
      )}
    >
      <div className="flex w-full max-w-md flex-col items-center gap-5 rounded-3xl border border-linen-100 bg-surface px-8 py-10 text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-ink-900/5 transition-all hover:shadow-[0_8px_40px_rgb(0,0,0,0.08)]">
        <div className="relative flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-red-50 to-orange-50 text-red-500 shadow-sm ring-1 ring-red-100/50">
          <div className="absolute inset-0 rounded-2xl bg-red-500/5 blur-xl" />
          <ServerCrash className="relative size-7 stroke-[1.5]" />
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-semibold tracking-tight text-ink-900">{title}</h3>
          <p className="mx-auto max-w-[36ch] text-[13px] leading-relaxed text-neutral-500">
            {message}
          </p>
        </div>

        {onRetry && (
          <div className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="md"
              className="h-10 gap-2 rounded-xl border-linen-200 bg-surface px-6 text-[13px] font-medium text-ink-900 shadow-sm transition-all hover:bg-linen-50 hover:text-ink-900 focus:ring-2 focus:ring-linen-200"
              onClick={onRetry}
            >
              <RefreshCcw className="size-3.5" />
              Try again
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
