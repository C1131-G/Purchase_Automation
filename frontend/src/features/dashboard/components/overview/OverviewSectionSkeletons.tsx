import { cn } from "@/shared/utils/cn";

import {
  OVERVIEW_AR_ROW_HEIGHT_REM,
  OVERVIEW_AR_VISIBLE_ROWS,
  overviewArListMaxHeightRem,
} from "../../utils/overview.layout";
import { OpenWorkStripSkeleton } from "./OpenWorkStrip";

/** Pulse block helper — keeps skeleton chrome consistent. */
function Pulse({ className }: { className: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-linen-200 [animation-duration:1.1s]", className)}
      aria-hidden
    />
  );
}

export function NeedsAttentionSkeleton() {
  return (
    <section
      aria-label="Open AR drafts"
      aria-busy="true"
      className="flex min-h-[320px] w-full flex-col overflow-hidden rounded-2xl border border-amber-200 bg-amber-50/30 shadow-sm"
    >
      <div className="border-b border-amber-200 bg-amber-50 px-5 py-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1 space-y-2">
            <Pulse className="h-4 w-56 max-w-full bg-amber-200" />
            <Pulse className="h-3 w-36 bg-amber-100" />
          </div>
          <Pulse className="h-7 w-9 shrink-0 rounded-lg bg-amber-500/20" />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="hidden shrink-0 gap-2 border-b border-amber-100 px-5 py-2.5 sm:grid sm:grid-cols-[minmax(0,5.5rem)_minmax(0,1fr)_minmax(0,6.5rem)_minmax(0,4rem)_minmax(0,5rem)]">
          <Pulse className="h-3 w-8 bg-amber-100" />
          <Pulse className="h-3 w-16 bg-amber-100" />
          <Pulse className="ml-auto h-3 w-12 bg-amber-100" />
          <Pulse className="ml-auto h-3 w-8 bg-amber-100" />
          <Pulse className="ml-auto h-3 w-10 bg-amber-100" />
        </div>

        <div
          className="flex flex-col overflow-hidden"
          style={{ maxHeight: `${overviewArListMaxHeightRem}rem` }}
        >
          {Array.from({ length: OVERVIEW_AR_VISIBLE_ROWS }, (_, index) => (
            <div
              key={index}
              className="grid shrink-0 grid-cols-1 gap-1.5 border-b border-amber-100 px-5 py-3.5 last:border-b-0 sm:grid-cols-[minmax(0,5.5rem)_minmax(0,1fr)_minmax(0,6.5rem)_minmax(0,4rem)_minmax(0,5rem)] sm:items-center sm:gap-2 sm:py-0"
              style={{ minHeight: `${OVERVIEW_AR_ROW_HEIGHT_REM}rem` }}
            >
              <div className="space-y-1.5">
                <Pulse className="h-3.5 w-14 bg-amber-100" />
                <Pulse className="h-2.5 w-20 bg-amber-50" />
              </div>
              <div className="space-y-1.5">
                <Pulse className="h-3.5 w-full max-w-[10rem]" />
                <Pulse className="h-2.5 w-16" />
              </div>
              <Pulse className="hidden h-3.5 w-16 justify-self-end sm:block" />
              <Pulse className="hidden h-3.5 w-8 justify-self-end sm:block" />
              <Pulse className="hidden h-6 w-14 justify-self-end rounded-lg bg-amber-100 sm:block" />
            </div>
          ))}
        </div>

        <div className="border-t border-amber-100 bg-amber-50 px-5 py-2">
          <Pulse className="mx-auto h-3 w-52 max-w-full bg-amber-200" />
        </div>
      </div>
    </section>
  );
}

export function ConnectedPartnersSkeleton() {
  return (
    <section
      aria-label="Connected vendors and customers"
      aria-busy="true"
      className="flex h-full min-h-[320px] w-full flex-col overflow-hidden rounded-2xl border border-violet-200 bg-violet-50/40 shadow-sm"
    >
      <div className="border-b border-violet-200 bg-violet-50 px-5 py-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1 space-y-2">
            <Pulse className="h-4 w-52 max-w-full bg-violet-200" />
            <Pulse className="h-3 w-44 bg-violet-100" />
          </div>
          <Pulse className="h-7 w-9 shrink-0 rounded-lg bg-violet-700/20" />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="shrink-0 border-b border-violet-100 px-2.5 py-2">
          <div className="flex items-center justify-between rounded-xl bg-violet-100 px-3 py-2.5 ring-1 ring-violet-200">
            <Pulse className="h-3.5 w-24 bg-violet-200" />
            <Pulse className="h-3 w-20 bg-violet-100" />
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-0.5 p-2.5">
          {[1, 2, 3].map((row) => (
            <div key={row} className="flex items-start gap-3 rounded-xl px-3 py-3">
              <Pulse className="mt-0.5 h-5 w-14 shrink-0 rounded-md bg-violet-200" />
              <div className="min-w-0 flex-1 space-y-2">
                <Pulse className="h-3.5 w-3/4 max-w-[12rem]" />
                <Pulse className="h-2.5 w-1/2 max-w-[8rem]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function StatementSkeleton() {
  return (
    <section
      aria-label="Statement"
      aria-busy="true"
      className="flex min-h-[260px] flex-col overflow-hidden rounded-2xl border border-linen-200 bg-surface shadow-sm shadow-linen-100/60"
    >
      <div className="border-b border-linen-100 bg-gradient-to-r from-linen-50/80 via-surface to-surface px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <Pulse className="h-4 w-28 bg-linen-200" />
            <Pulse className="h-3 w-64 max-w-full bg-linen-100" />
            <Pulse className="h-2.5 w-24 bg-linen-100" />
          </div>
          <Pulse className="h-8 w-24 rounded-lg bg-linen-100" />
        </div>
      </div>

      <div className="flex flex-col gap-5 p-5">
        <div className="flex gap-2 rounded-xl border border-linen-200 bg-linen-50 px-3.5 py-3">
          <Pulse className="mt-0.5 size-3.5 shrink-0 rounded-full bg-teal-100" />
          <div className="min-w-0 flex-1 space-y-2">
            <Pulse className="h-3 w-full max-w-md" />
            <Pulse className="h-3 w-4/5 max-w-sm" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[
            "border-linen-200 bg-linen-50",
            "border-linen-300 bg-linen-100",
            "border-amber-200/70 bg-amber-50/70",
            "border-rose-200/70 bg-rose-50/70",
            "border-rose-200/70 bg-rose-50/70",
          ].map((tone, index) => (
            <div
              key={`${tone}-${index}`}
              className={cn("animate-pulse rounded-xl border px-3.5 py-3 shadow-sm", tone)}
            >
              <Pulse className="mb-2 h-3 w-10 bg-surface/80" />
              <Pulse className="h-5 w-16 bg-surface/70" />
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-teal-100/70 bg-gradient-to-br from-teal-50/40 via-surface to-linen-50/40 px-4 py-3.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-2">
              <Pulse className="h-3 w-36 bg-teal-100/70" />
              <Pulse className="h-2.5 w-48 max-w-full bg-surface/80" />
            </div>
            <Pulse className="h-7 w-28 bg-surface/80" />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <Pulse className="h-3 w-36" />
          <Pulse className="h-4 w-24" />
        </div>

        <div className="overflow-hidden rounded-xl border border-linen-100">
          <div className="border-b border-linen-100 bg-linen-50 px-4 py-2.5">
            <Pulse className="h-3 w-28" />
          </div>
          <ul className="divide-y divide-linen-100">
            {[1, 2, 3].map((row) => (
              <li key={row} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0 flex-1 space-y-2">
                  <Pulse className="h-3.5 w-32 max-w-full" />
                  <Pulse className="h-2.5 w-24" />
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="space-y-1.5 text-right">
                    <Pulse className="ml-auto h-2.5 w-10" />
                    <Pulse className="h-3.5 w-16" />
                  </div>
                  <div className="space-y-1.5 text-right">
                    <Pulse className="ml-auto h-2.5 w-12" />
                    <Pulse className="h-3.5 w-14 bg-rose-100/80" />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/** Full overview body skeleton — matches current dashboard section order and grid. */
export function OverviewDashboardContentSkeleton() {
  return (
    <>
      <OpenWorkStripSkeleton />

      <div
        id="overview-needs-attention"
        className="grid scroll-mt-4 grid-cols-1 items-stretch gap-5 lg:grid-cols-5 lg:gap-6"
      >
        <div className="flex min-h-0 lg:col-span-3">
          <NeedsAttentionSkeleton />
        </div>
        <div className="flex min-h-0 lg:col-span-2">
          <ConnectedPartnersSkeleton />
        </div>
      </div>

      <StatementSkeleton />
    </>
  );
}

/** One full-page skeleton shared by route loading and initial data loading. */
export function OverviewDashboardSkeleton() {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-surface" aria-busy="true">
      <header className="shrink-0 border-b border-teal-100/50 bg-gradient-to-r from-teal-50/60 via-surface to-linen-50/60 px-6 py-5 sm:px-8">
        <div className="mx-auto flex max-w-7xl items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-2">
            <Pulse className="h-7 w-40" />
            <Pulse className="h-4 w-80 max-w-full bg-linen-100" />
          </div>
          <Pulse className="h-9 w-28 shrink-0 rounded-xl bg-linen-100" />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto bg-gradient-to-b from-teal-50/15 via-surface to-linen-50/30 px-6 py-8 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 sm:gap-10">
          <OverviewDashboardContentSkeleton />
        </div>
      </div>
    </div>
  );
}
