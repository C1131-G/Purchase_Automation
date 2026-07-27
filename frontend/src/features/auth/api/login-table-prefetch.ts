import type { QueryClient } from "@tanstack/react-query";

import { createSharedQueries } from "@/features/create-pages/create-shared/api/create-shared.queries";
import { overviewDashboardQueryOptions } from "@/features/dashboard/queries/queries";
import { apCreditMemoQueries } from "@/features/table-pages/ap-credit-memo/api/ap-credit-memo.queries";
import { apInvoiceQueries } from "@/features/table-pages/ap-invoices/api/ap-invoice.queries";
import { grpoQueries } from "@/features/table-pages/grpo/api/grpo.queries";
import { outgoingPaymentQueries } from "@/features/table-pages/outgoing-payment/api/outgoing-payment.queries";
import { purchaseOrderQueries } from "@/features/table-pages/purchase-orders/api/purchase-order.queries";
import { purchaseQuotationQueries } from "@/features/table-pages/purchase-quotations/api/purchase-quotation.queries";
import { salesQuotationQueries } from "@/features/table-pages/sales-quotations/api/sales-quotation.queries";

// ---------------------------------------------------------------------------
// Shared constants
// ---------------------------------------------------------------------------

const defaultTableParams = {
  limit: 10,
  page: 1,
};

const docNumQuickLimit = 10;
/** Keep background warmup gentle so HANA pool stays free for Overview first paint. */
const backgroundBatchSize = 2;
/** Wait longer before table warmup so dashboard /overview finishes first. */
const tableWarmupIdleTimeoutMs = 4000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const prefetchQuery = (queryClient: QueryClient, queryOptions: unknown) =>
  queryClient.prefetchQuery(queryOptions as never);

const prefetchQueryBatch = async (queryClient: QueryClient, queries: unknown[]) => {
  for (let index = 0; index < queries.length; index += backgroundBatchSize) {
    const batch = queries.slice(index, index + backgroundBatchSize);
    await Promise.allSettled(batch.map((queryOptions) => prefetchQuery(queryClient, queryOptions)));
  }
};

/**
 * scheduleIdlePrefetch: Run a task when the browser is idle.
 * Falls back to setTimeout on browsers without requestIdleCallback.
 * Exported so callers (e.g. use-login) can schedule the full warmup
 * after navigation has already committed.
 */
export const scheduleIdlePrefetch = (
  task: () => Promise<void>,
  idleTimeoutMs = tableWarmupIdleTimeoutMs,
) => {
  if (typeof window === "undefined") {
    void task();
    return;
  }

  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(
      () => {
        void task();
      },
      {
        timeout: idleTimeoutMs,
      },
    );
    return;
  }

  globalThis.setTimeout(() => {
    void task();
  }, idleTimeoutMs);
};

/**
 * Prefetch Overview immediately after login (session cookie is already set).
 * Backend also warms the same cache; this populates the React Query cache so
 * the dashboard route can paint without waiting for mount-time fetch.
 */
export const prefetchOverviewAfterLogin = async (queryClient: QueryClient) => {
  const startedAt = Date.now();
  try {
    await queryClient.prefetchQuery(overviewDashboardQueryOptions());
    // eslint-disable-next-line no-console
    console.debug(`[perf] overview prefetch complete: ${Date.now() - startedAt}ms`);
  } catch (error) {
    // Non-fatal — Overview mounts and fetches itself on 401/network blip.
    // eslint-disable-next-line no-console
    console.debug("[perf] overview prefetch skipped", error);
  }
};

// ---------------------------------------------------------------------------
// Background (deferred) prefetches — run during idle time after first paint.
//
// Overview is prefetched separately (immediate). Table/master warmup stays
// deferred so it does not compete with /dashboard/overview on the HANA pool.
// ---------------------------------------------------------------------------

const backgroundPrefetches = [
  purchaseQuotationQueries.list(defaultTableParams),
  purchaseQuotationQueries.docNumSuggestions(undefined, docNumQuickLimit),
  purchaseOrderQueries.list(defaultTableParams),
  purchaseOrderQueries.docNumSuggestions(undefined, docNumQuickLimit),
  createSharedQueries.customers(),
  createSharedQueries.salesEmployees(),
  createSharedQueries.taxCodes(),
  createSharedQueries.vendors(),
  createSharedQueries.warehouses(),
  apCreditMemoQueries.list(defaultTableParams),
  apCreditMemoQueries.docNumSuggestions(undefined, docNumQuickLimit),
  apInvoiceQueries.list(defaultTableParams),
  apInvoiceQueries.docNumSuggestions(undefined, docNumQuickLimit),
  grpoQueries.list(defaultTableParams),
  grpoQueries.docNumSuggestions(undefined, docNumQuickLimit),
  outgoingPaymentQueries.list(defaultTableParams),
  outgoingPaymentQueries.docNumSuggestions(undefined, docNumQuickLimit),
  salesQuotationQueries.list(defaultTableParams),
  salesQuotationQueries.docNumSuggestions(undefined, docNumQuickLimit),
];

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * prefetchTableDataAfterLogin
 *
 * Warms table lists, doc-num suggestion caches, and master-data in the
 * background during idle time so they are ready before the user navigates
 * to any table page. Intentionally deferred — this must not compete with
 * the dashboard's own first-paint queries.
 */
export const prefetchTableDataAfterLogin = async (queryClient: QueryClient) => {
  const warmupStart = Date.now();
  await prefetchQueryBatch(queryClient, backgroundPrefetches);
  // eslint-disable-next-line no-console
  console.debug(`[perf] background table warmup complete: ${Date.now() - warmupStart}ms`);
};
