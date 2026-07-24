import { useMemo, useState } from "react";
import { RefreshCcw } from "lucide-react";

import { SectionErrorState } from "@/components/section-error-state";
import { useOverviewDashboard } from "../../queries/queries";
import type {
  OverviewConnectedPartner,
  OverviewPartnerSelection,
} from "../../utils/overview.types";
import { partnerSelectionKey } from "../../utils/overview.types";
import { ConnectedPartners } from "./ConnectedPartners";
import { NeedsAttentionSkeleton } from "./OverviewSectionSkeletons";
import { OpenWorkStrip, OpenWorkStripSkeleton } from "./OpenWorkStrip";
import { StatementShell } from "./StatementShell";

function formatAsOf(iso: string | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    day: "numeric",
  });
}

export function OverviewDashboard() {
  const { data, isLoading, isError, isFetching, refetch } = useOverviewDashboard();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const scrollToAttention = () => {
    document.getElementById("overview-needs-attention")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const scrollToStatement = () => {
    document.getElementById("overview-statement")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const partners = data?.connectedPartners ?? [];

  const effectiveSelectedKey = useMemo(() => {
    if (!selectedKey) return null;
    const stillPresent = partners.some((item) => partnerSelectionKey(item) === selectedKey);
    return stillPresent ? selectedKey : null;
  }, [partners, selectedKey]);

  const selection: OverviewPartnerSelection = useMemo(() => {
    if (!effectiveSelectedKey) {
      return { kind: "all" };
    }
    const partner = partners.find((item) => partnerSelectionKey(item) === effectiveSelectedKey);
    if (!partner) {
      return { kind: "all" };
    }
    return {
      kind: "partner",
      mappingId: partner.mappingId,
      role: partner.role,
      cardCode: partner.cardCode,
      cardName: partner.cardName,
      partnerCompanyName: partner.partnerCompanyName,
    };
  }, [partners, effectiveSelectedKey]);

  const handleSelectAll = () => {
    setSelectedKey(null);
    scrollToStatement();
  };

  const handleSelectPartner = (partner: OverviewConnectedPartner) => {
    setSelectedKey(partnerSelectionKey(partner));
    scrollToStatement();
  };

  const asOfLabel = formatAsOf(data?.asOf);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-zinc-50">
      <header className="shrink-0 border-b border-zinc-200/80 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-balance text-zinc-950">
              Overview
            </h1>
            <p className="mt-0.5 text-sm text-zinc-500">
              Open work and partner exposure for this company.
            </p>
          </div>
          <div className="flex items-center gap-2 pt-1 text-xs text-zinc-400">
            {isFetching && !isLoading ? (
              <span className="text-zinc-500">Updating…</span>
            ) : asOfLabel ? (
              <span>As of {asOfLabel}</span>
            ) : null}
            <button
              type="button"
              onClick={() => void refetch()}
              className="inline-flex size-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-500 transition-colors hover:bg-zinc-50 hover:text-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
              aria-label="Refresh overview"
            >
              <RefreshCcw className={`size-3.5 ${isFetching ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-7">
          {isError ? (
            <SectionErrorState
              title="Couldn't load overview"
              message="Check your session and try again."
              onRetry={() => void refetch()}
            />
          ) : (
            <>
              {isLoading || !data ? (
                <OpenWorkStripSkeleton />
              ) : (
                <OpenWorkStrip
                  currency={data.currency}
                  openPq={data.kpis.openPq}
                  openSq={data.kpis.openSq}
                  openPo={data.kpis.openPo}
                  arPending={data.kpis.arApprovalPending}
                  onArClick={scrollToAttention}
                />
              )}

              <div
                id="overview-needs-attention"
                className="grid grid-cols-1 gap-4 scroll-mt-4 lg:grid-cols-5"
              >
                <div className="lg:col-span-3">
                  <NeedsAttentionSkeleton />
                </div>
                <div className="lg:col-span-2">
                  {isLoading || !data ? (
                    <div className="flex min-h-[220px] animate-pulse flex-col rounded-xl border border-zinc-200 bg-white">
                      <div className="border-b border-zinc-100 px-4 py-3">
                        <div className="h-4 w-40 rounded bg-zinc-200" />
                        <div className="mt-2 h-3 w-48 rounded bg-zinc-100" />
                      </div>
                      <div className="flex flex-1 flex-col gap-3 p-4">
                        {[1, 2, 3].map((row) => (
                          <div key={row} className="flex items-center gap-3">
                            <div className="h-3.5 flex-1 rounded bg-zinc-200" />
                            <div className="h-3.5 w-16 rounded bg-zinc-100" />
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <ConnectedPartners
                      partners={data.connectedPartners}
                      selectedKey={effectiveSelectedKey}
                      onSelectAll={handleSelectAll}
                      onSelectPartner={handleSelectPartner}
                    />
                  )}
                </div>
              </div>

              {isLoading || !data ? (
                <div className="flex min-h-[180px] animate-pulse flex-col rounded-xl border border-zinc-200 bg-white">
                  <div className="border-b border-zinc-100 px-4 py-3">
                    <div className="h-4 w-24 rounded bg-zinc-200" />
                    <div className="mt-2 h-3 w-56 rounded bg-zinc-100" />
                  </div>
                  <div className="flex flex-1 flex-col justify-center gap-3 p-4">
                    <div className="grid grid-cols-4 gap-3">
                      {[1, 2, 3, 4].map((cell) => (
                        <div key={cell} className="h-14 rounded-lg bg-zinc-100" />
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <StatementShell selection={selection} partnerCount={partners.length} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
