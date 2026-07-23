import { Building2 } from "lucide-react";

import { useIcHealth } from "@/features/intercompany/api/intercompany.queries";

/**
 * Hidden shell placeholder for `/intercompany`.
 * P4: no RFQ inbox, no notification list, no nav badge (those land in P8).
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
      <div className="max-w-md rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-sky-50 text-sky-700">
          <Building2 aria-hidden className="h-6 w-6" />
        </div>
        <h1 className="text-lg font-semibold tracking-tight text-zinc-900">Intercompany</h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600">
          Coming soon. Notification inbox and RFQ screens will ship in a later phase. Purchase and
          sales document create flows are unchanged.
        </p>
        {phaseLabel ? (
          <p className="mt-4 text-xs font-medium uppercase tracking-wide text-zinc-400">
            {phaseLabel}
          </p>
        ) : null}
      </div>
    </div>
  );
}
