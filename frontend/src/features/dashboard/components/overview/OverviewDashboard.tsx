import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { RefreshCcw } from "lucide-react";

import { SectionErrorState } from "@/components/section-error-state";
import { cn } from "@/shared/utils/cn";

import { useOverviewDashboard } from "../../queries/queries";
import { dashboardKeys } from "../../queries/queryKeys";
import type {
  OverviewConnectedPartner,
  OverviewPartnerSelection,
} from "../../utils/overview.types";
import { partnerSelectionKey } from "../../utils/overview.types";
import { overviewMotionClass } from "../../utils/overview.motion";
import { ConnectedPartners } from "./ConnectedPartners";
import { NeedsAttention } from "./NeedsAttention";
import { OverviewDashboardSkeleton } from "./OverviewSectionSkeletons";
import { OpenWorkStrip } from "./OpenWorkStrip";
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
  const queryClient = useQueryClient();
  const { data, isLoading, isError, isFetching, refetch, error } = useOverviewDashboard();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const refreshOverview = () => {
    void refetch();
    void queryClient.invalidateQueries({ queryKey: dashboardKeys.arInvoiceDrafts() });
  };

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

  if (isLoading || (!data && !isError)) {
    return <OverviewDashboardSkeleton />;
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-surface">
      <header className="shrink-0 border-b border-teal-100/50 bg-gradient-to-r from-teal-50/60 via-surface to-linen-50/60 px-6 py-5 sm:px-8">
        <div className="mx-auto flex max-w-7xl items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-balance text-ink-900">
              Dashboard
            </h1>
            <p className="mt-1 text-sm text-neutral-500">
              Open documents, approvals, and partner balances for this company.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2.5 pt-1 text-xs text-neutral-500">
            {isLoading ? (
              <span
                className="h-7 w-28 animate-pulse rounded-full bg-linen-100 ring-1 ring-linen-200"
                aria-hidden
              />
            ) : isFetching ? (
              <span className="rounded-full bg-teal-50 px-2.5 py-1 font-medium text-teal-700 ring-1 ring-teal-100">
                Updating…
              </span>
            ) : asOfLabel && !isError ? (
              <span className="rounded-full bg-surface px-2.5 py-1 font-medium text-neutral-600 ring-1 ring-linen-200">
                As of {asOfLabel}
              </span>
            ) : null}
            <button
              type="button"
              onClick={refreshOverview}
              disabled={isFetching}
              className={cn(
                "inline-flex size-9 cursor-pointer items-center justify-center rounded-xl border border-teal-200/60 bg-surface text-teal-700 shadow-sm",
                "transition-[transform,background-color,color] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)]",
                "hover:bg-teal-50 hover:text-teal-900 active:scale-[0.97]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/40",
                "disabled:cursor-not-allowed disabled:opacity-60",
              )}
              aria-label="Refresh overview"
            >
              <RefreshCcw className={`size-3.5 ${isFetching ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto bg-gradient-to-b from-teal-50/15 via-surface to-linen-50/30 px-6 py-8 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 sm:gap-10">
          {isError ? (
            <SectionErrorState
              title="Couldn't load overview"
              message={errorMessage}
              onRetry={refreshOverview}
              className="min-h-[280px] rounded-2xl border border-rose-200/80 bg-surface shadow-sm"
            />
          ) : data ? (
            <>
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

              <div
                id="overview-needs-attention"
                className="grid scroll-mt-4 grid-cols-1 items-stretch gap-5 lg:grid-cols-5 lg:gap-6"
              >
                <div className="flex min-h-0 lg:col-span-3">
                  <div className={cn("flex w-full min-h-0 flex-1", overviewMotionClass.enter)}>
                    <NeedsAttention
                      kpi={data.kpis.arApprovalPending}
                      currency={data.currency}
                      initialItems={data.arApprovalPending}
                    />
                  </div>
                </div>
                <div className="flex min-h-0 lg:col-span-2">
                  <div className={cn("flex w-full min-h-0 flex-1", overviewMotionClass.enter)}>
                    <ConnectedPartners
                      partners={data.connectedPartners}
                      selectedKey={effectiveSelectedKey}
                      onSelectAll={handleSelectAll}
                      onSelectPartner={handleSelectPartner}
                    />
                  </div>
                </div>
              </div>

              <div className={overviewMotionClass.enter}>
                <StatementShell
                  selection={selection}
                  partnerCount={partners.length}
                  statement={data.statement}
                  currency={data.currency}
                  asOf={data.asOf}
                />
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
