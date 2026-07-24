import { useMemo, useState } from "react";
import { RefreshCcw } from "lucide-react";

import { SectionErrorState } from "@/components/section-error-state";
import { cn } from "@/shared/utils/cn";

import { useOverviewDashboard } from "../../queries/queries";
import type {
  OverviewConnectedPartner,
  OverviewPartnerSelection,
} from "../../utils/overview.types";
import { partnerSelectionKey } from "../../utils/overview.types";
import { overviewMotionClass } from "../../utils/overview.motion";
import { ConnectedPartners } from "./ConnectedPartners";
import { NeedsAttention } from "./NeedsAttention";
import {
  ConnectedPartnersSkeleton,
  NeedsAttentionSkeleton,
  StatementSkeleton,
} from "./OverviewSectionSkeletons";
import { OpenWorkStrip, OpenWorkStripSkeleton } from "./OpenWorkStrip";
import { StatementShell } from "./StatementShell";

import "./overview.css";

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
  const { data, isLoading, isError, isFetching, refetch, error } = useOverviewDashboard();
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
  const errorMessage =
    error instanceof Error && error.message.trim()
      ? error.message
      : "Check your session and try again.";

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-white">
      <header className="shrink-0 border-b border-sky-100/80 bg-gradient-to-r from-sky-50/90 via-white to-violet-50/50 px-6 py-5 sm:px-8">
        <div className="mx-auto flex max-w-7xl items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-semibold tracking-tight text-balance text-zinc-950">
                Overview
              </h1>
              <span className="rounded-full bg-sky-100/90 px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-sky-800 ring-1 ring-sky-200/80">
                Ops desk
              </span>
            </div>
            <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-zinc-500">
              Open work and partner exposure for this company — scan, jump, act.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2.5 pt-1 text-xs text-zinc-500">
            {isFetching && !isLoading ? (
              <span className="rounded-full bg-sky-50 px-2.5 py-1 font-medium text-sky-700 ring-1 ring-sky-100">
                Updating…
              </span>
            ) : asOfLabel && !isError ? (
              <span className="rounded-full bg-white px-2.5 py-1 font-medium text-zinc-600 ring-1 ring-zinc-200/80">
                As of {asOfLabel}
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => void refetch()}
              disabled={isFetching}
              className={cn(
                "inline-flex size-9 items-center justify-center rounded-xl border border-sky-200/80 bg-white text-sky-700 shadow-sm",
                "transition-[transform,background-color,color] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)]",
                "hover:bg-sky-50 hover:text-sky-900 active:scale-[0.97]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50",
                "disabled:cursor-not-allowed disabled:opacity-60",
              )}
              aria-label="Refresh overview"
            >
              <RefreshCcw className={`size-3.5 ${isFetching ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto bg-gradient-to-b from-sky-50/40 via-white to-violet-50/30 px-6 py-8 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 sm:gap-10">
          {isError ? (
            <SectionErrorState
              title="Couldn't load overview"
              message={errorMessage}
              onRetry={() => void refetch()}
              className="min-h-[280px] rounded-2xl border border-rose-200/80 bg-white shadow-sm"
            />
          ) : (
            <>
              {isLoading || !data ? (
                <OpenWorkStripSkeleton />
              ) : (
                <div className={overviewMotionClass.enter}>
                  <OpenWorkStrip
                    currency={data.currency}
                    openPq={data.kpis.openPq}
                    openSq={data.kpis.openSq}
                    openPo={data.kpis.openPo}
                    arPending={data.kpis.arApprovalPending}
                    onArClick={scrollToAttention}
                  />
                </div>
              )}

              <div
                id="overview-needs-attention"
                className="grid scroll-mt-4 grid-cols-1 gap-5 lg:grid-cols-5 lg:gap-6"
              >
                <div className="lg:col-span-3">
                  {isLoading || !data ? (
                    <NeedsAttentionSkeleton />
                  ) : (
                    <div className={overviewMotionClass.enter}>
                      <NeedsAttention items={data.arApprovalPending} currency={data.currency} />
                    </div>
                  )}
                </div>
                <div className="lg:col-span-2">
                  {isLoading || !data ? (
                    <ConnectedPartnersSkeleton />
                  ) : (
                    <div className={overviewMotionClass.enter}>
                      <ConnectedPartners
                        partners={data.connectedPartners}
                        selectedKey={effectiveSelectedKey}
                        onSelectAll={handleSelectAll}
                        onSelectPartner={handleSelectPartner}
                      />
                    </div>
                  )}
                </div>
              </div>

              {isLoading || !data ? (
                <StatementSkeleton />
              ) : (
                <div className={overviewMotionClass.enter}>
                  <StatementShell
                    selection={selection}
                    partnerCount={partners.length}
                    statement={data.statement}
                    currency={data.currency}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
