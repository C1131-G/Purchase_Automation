import { Building2 } from "lucide-react";

import { useIcHealth } from "@/features/intercompany/api/intercompany.queries";

/**
 * Reserved placeholder (e.g. RFQ inbox landing).
 * Notifications live at `/intercompany/notifications` (P8A).
 */
export function IcComingSoonPage() {
  const healthQuery = useIcHealth(true);

  const phaseLabel =
    healthQuery.data?.data.phase != null
      ? `Backend phase: ${healthQuery.data.data.phase}`
      : healthQuery.isError
        ? "Backend health unavailable"
        : healthQuery.isLoading
          ? "Checking module…"
          : null;

  return (
    <div className="flex h-full w-full items-center justify-center p-8">
      <div className="max-w-md rounded-2xl border border-linen-200 bg-surface p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-sky-50 text-sky-700">
          <Building2 aria-hidden className="h-6 w-6" />
        </div>
        <h1 className="text-lg font-semibold tracking-tight text-ink-900">Intercompany</h1>
        <p className="mt-2 text-sm leading-relaxed text-neutral-500">
          RFQ inbox will ship in a later phase. Notifications and the retry queue are available
          under Intercompany. Purchase and sales document create flows are unchanged.
        </p>
        {phaseLabel ? (
          <p className="mt-4 text-xs font-medium uppercase tracking-wide text-neutral-400">
            {phaseLabel}
          </p>
        ) : null}
      </div>
    </div>
  );
}
