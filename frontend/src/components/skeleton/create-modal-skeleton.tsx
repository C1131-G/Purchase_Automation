import { useMemo } from "react";

import { AnimatedModalShell } from "@/features/create-pages/create-shared/components/core/animated-modal-shell";

interface CreateModalSkeletonProps {
  title?: string;
  subtitle?: string;
  columns?: number;
  rows?: number;
  panelClassName?: string;
}

/**
 * CreateModalSkeleton: High-fidelity loading state for transactional creation modals.
 * ARCHITECTURE: Dynamic grid-based skeleton that adapts to specific form structures.
 * UX: Eliminates cumulative layout shift (CLS) by reserving exact form dimensions.
 */
export function CreateModalSkeleton({
  title = "Loading",
  subtitle,
  columns = 2,
  rows = 6,
  panelClassName = "max-w-xl",
}: CreateModalSkeletonProps) {
  const headerKeys = useMemo(
    () => Array.from({ length: columns }, (_, position) => `header-${position + 1}`),
    [columns],
  );
  const rowKeys = useMemo(
    () => Array.from({ length: rows }, (_, position) => `row-${position + 1}`),
    [rows],
  );

  return (
    <AnimatedModalShell open onClose={() => {}} panelClassName={panelClassName}>
      <div className="flex items-center justify-between border-b border-linen-100 px-4 py-3">
        <div className="space-y-1">
          <div className="h-4 w-32 rounded bg-linen-100 animate-pulse [animation-duration:1.1s]" />
          {subtitle ? (
            <div className="h-3 w-40 rounded bg-linen-100 animate-pulse [animation-duration:1.1s]" />
          ) : null}
          <span className="sr-only">{title}</span>
        </div>
        <div className="h-7 w-16 rounded-full border border-linen-100 bg-linen-50 animate-pulse" />
      </div>

      <div className="p-4">
        <div className="mb-3 h-10 w-full rounded-xl border border-linen-100 bg-linen-50 animate-pulse" />
        <div className="overflow-hidden rounded-xl border border-linen-200">
          <div className="border-b border-linen-100 bg-linen-50 px-3 py-2">
            <div
              className="grid gap-3"
              style={{
                gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
              }}
            >
              {headerKeys.map((headerKey) => (
                <div key={headerKey} className="h-3 w-16 rounded bg-linen-100 animate-pulse" />
              ))}
            </div>
          </div>
          <div className="max-h-80 overflow-auto p-3 space-y-2">
            {rowKeys.map((rowKey) => (
              <div key={rowKey} className="h-8 w-full rounded-lg bg-linen-100 animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    </AnimatedModalShell>
  );
}
