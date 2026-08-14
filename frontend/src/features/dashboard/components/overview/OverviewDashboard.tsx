import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { RefreshCcw } from "lucide-react";
import { useShallow } from "zustand/react/shallow";

import { SectionErrorState } from "@/components/section-error-state";
import { IcDashboardStatusActions } from "@/features/intercompany/components/ic-dashboard-status-actions";
import { cn } from "@/shared/utils/cn";
import { useAuthStore } from "@/store/auth/auth.store";

import { useOverviewRelationships, useOverviewWork } from "../../queries/queries";
import { dashboardKeys } from "../../queries/queryKeys";
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

export function OverviewDashboard() {
  const queryClient = useQueryClient();
  const workQuery = useOverviewWork();
  const relationshipsQuery = useOverviewRelationships();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const isFetching = workQuery.isFetching || relationshipsQuery.isFetching;
  const { companyName, dbName } = useAuthStore(
    useShallow((state) => ({
      companyName: state.user?.companyName?.trim() ?? "",
      dbName: state.user?.dbName?.trim() ?? "",
    })),
  );

  const refreshOverview = (): void => {
    void Promise.all([
      queryClient.invalidateQueries({ queryKey: dashboardKeys.overview() }),
      queryClient.invalidateQueries({ queryKey: dashboardKeys.arInvoiceDrafts() }),
    ]);
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

  const partners = relationshipsQuery.data?.connectedPartners ?? [];

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

  const workErrorMessage =
    workQuery.error instanceof Error && workQuery.error.message.trim()
      ? workQuery.error.message
      : "Work metrics could not be loaded. Try again.";
  const relationshipsErrorMessage =
    relationshipsQuery.error instanceof Error && relationshipsQuery.error.message.trim()
      ? relationshipsQuery.error.message
      : "Partner information could not be loaded. Try again.";

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-surface">
      <header className="shrink-0 border-b border-linen-100 bg-surface px-6 py-5 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-balance text-ink-900">
              Dashboard
            </h1>
            {companyName || dbName ? (
              <div className="mt-1 min-w-0 space-y-0.5">
                {companyName ? (
                  <p className="text-sm leading-snug text-pretty text-ink-700">{companyName}</p>
                ) : null}
                {dbName ? (
                  <p className="text-xs leading-snug text-neutral-500">
                    Database
                    <span aria-hidden="true" className="px-1.5 text-linen-300">
                      ·
                    </span>
                    {dbName}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
          <div className="flex w-full items-center justify-between gap-2.5 text-xs text-neutral-500 sm:w-auto sm:shrink-0 sm:justify-end sm:pt-1">
            {isFetching ? (
              <span className="rounded-full bg-teal-50 px-2.5 py-1 font-medium text-teal-700 ring-1 ring-teal-100">
                Updating…
              </span>
            ) : null}
            <IcDashboardStatusActions />
            <button
              type="button"
              onClick={refreshOverview}
              disabled={isFetching}
              className={cn(
                "inline-flex size-9 cursor-pointer items-center justify-center rounded-xl border border-teal-200/60 bg-surface text-teal-700 shadow-sm",
                "transition-[transform,background-color,color] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)]",
                "hover:bg-teal-50 hover:text-teal-900 active:scale-[0.97]",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500",
                "disabled:cursor-not-allowed disabled:opacity-60",
              )}
              aria-label="Refresh overview"
            >
              <RefreshCcw
                className={`size-3.5 ${isFetching ? "motion-safe:animate-spin" : ""}`}
                aria-hidden
              />
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto bg-gradient-to-b from-teal-50/15 via-surface to-linen-50/30 px-6 py-8 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 sm:gap-10">
          <div className={overviewMotionClass.enter}>
            {workQuery.data ? (
              <OpenWorkStrip
                currency={workQuery.data.currency}
                openPq={workQuery.data.kpis.openPq}
                openSq={workQuery.data.kpis.openSq}
                openPo={workQuery.data.kpis.openPo}
                arPending={workQuery.data.kpis.arApprovalPending}
                onArClick={scrollToAttention}
              />
            ) : workQuery.isError ? (
              <SectionErrorState
                title="Couldn't load work metrics"
                message={workErrorMessage}
                onRetry={refreshOverview}
                variant="compact"
                className="min-h-32"
              />
            ) : (
              <OpenWorkStripSkeleton />
            )}
          </div>

          <div
            id="overview-needs-attention"
            className="grid scroll-mt-4 grid-cols-1 items-stretch gap-5 lg:grid-cols-5 lg:gap-6"
          >
            <div className="flex min-h-0 lg:col-span-3">
              <div className={cn("flex w-full min-h-0 flex-1", overviewMotionClass.enter)}>
                {workQuery.data ? (
                  <NeedsAttention
                    kpi={workQuery.data.kpis.arApprovalPending}
                    currency={workQuery.data.currency}
                    initialItems={workQuery.data.arApprovalPending}
                  />
                ) : workQuery.isError ? (
                  <SectionErrorState
                    title="Couldn't load A/R drafts"
                    message={workErrorMessage}
                    onRetry={refreshOverview}
                    variant="compact"
                    className="min-h-[320px] w-full"
                  />
                ) : (
                  <NeedsAttentionSkeleton />
                )}
              </div>
            </div>
            <div className="flex min-h-0 lg:col-span-2">
              <div className={cn("flex w-full min-h-0 flex-1", overviewMotionClass.enter)}>
                {relationshipsQuery.data ? (
                  <ConnectedPartners
                    partners={relationshipsQuery.data.connectedPartners}
                    selectedKey={effectiveSelectedKey}
                    onSelectAll={handleSelectAll}
                    onSelectPartner={handleSelectPartner}
                  />
                ) : relationshipsQuery.isError ? (
                  <SectionErrorState
                    title="Couldn't load connected partners"
                    message={relationshipsErrorMessage}
                    onRetry={refreshOverview}
                    variant="compact"
                    className="min-h-[320px] w-full"
                  />
                ) : (
                  <ConnectedPartnersSkeleton />
                )}
              </div>
            </div>
          </div>

          <div className={overviewMotionClass.enter}>
            {relationshipsQuery.data && workQuery.data ? (
              <StatementShell
                selection={selection}
                partnerCount={partners.length}
                statement={relationshipsQuery.data.statement}
                currency={workQuery.data.currency}
                asOf={relationshipsQuery.data.asOf}
              />
            ) : relationshipsQuery.isError || workQuery.isError ? (
              <SectionErrorState
                title="Couldn't load statement"
                message={relationshipsQuery.isError ? relationshipsErrorMessage : workErrorMessage}
                onRetry={refreshOverview}
                variant="compact"
                className="min-h-[260px]"
              />
            ) : (
              <StatementSkeleton />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
